import * as cheerio from "cheerio";
import type { Channel, Message, PhotoMedia } from "../models/types.js";

export type SelectorOverrides = Partial<{
  channelTitle: string;
  channelDescription: string;
  channelAvatar: string;
  messageBubble: string;
  messageText: string;
  messageDate: string;
}>;

const DEFAULTS: Required<SelectorOverrides> = {
  channelTitle: ".tgme_page_title span",
  channelDescription: ".tgme_page_description",
  channelAvatar: ".tgme_page_photo_image",
  messageBubble: ".tgme_widget_message_wrap .js-widget_message",
  messageText: ".tgme_widget_message_text.js-message_text",
  messageDate: ".tgme_widget_message_date time",
};

export class ParserRegistry {
  private readonly sel: Required<SelectorOverrides>;

  constructor(overrides: SelectorOverrides = {}) {
    this.sel = { ...DEFAULTS, ...overrides };
  }

  getSelector(key: keyof SelectorOverrides, fallback: string): string {
    return this.sel[key] ?? fallback;
  }

  parseChannel(html: string, username: string): Channel {
    const $ = cheerio.load(html);
    const title = $(this.sel.channelTitle).first().text().trim();
    const description = $(this.sel.channelDescription).first().text().trim() || undefined;
    const avatarUrl = $(this.sel.channelAvatar).first().attr("src");
    const subscribersText = $(".tgme_page_extra").first().text().trim();
    return {
      username,
      title,
      description,
      avatarUrl,
      counts: { subscribers: subscribersText || undefined },
    };
  }

  parseMessages(html: string, username: string): Message[] {
    const $ = cheerio.load(html);
    const messages: Message[] = [];
    $(this.sel.messageBubble).each((_, el) => {
      const post = $(el).attr("data-post") ?? "";
      const idStr = post.split("/")[1];
      const id = idStr ? parseInt(idStr, 10) : NaN;
      if (isNaN(id)) return;

      const textEl = $(el).find(this.sel.messageText).last();
      const text = textEl.text().trim();

      const datetimeAttr = $(el).find(this.sel.messageDate).attr("datetime");
      const date = datetimeAttr ? new Date(datetimeAttr) : new Date(0);

      const viewsText = $(el).find(".tgme_widget_message_views").first().text().trim();

      const media: PhotoMedia[] = [];
      $(el).find(".tgme_widget_message_photo_wrap").each((_, img) => {
        const style = $(img).attr("style") ?? "";
        const match = style.match(/url\('([^']+)'\)/);
        if (match?.[1]) media.push({ type: "photo", url: match[1] });
      });

      // Forwarded from detection
      const $fwd = $(el).find(".tgme_widget_message_forwarded_from");
      let forwardFrom = undefined;
      if ($fwd.length > 0) {
        const $fwdName = $fwd.find(".tgme_widget_message_forwarded_from_name");
        const name = $fwdName.text().trim() || $fwd.text().replace(/Forwarded from/i, "").trim();
        const href = $fwdName.attr("href") || $fwd.find("a").attr("href");
        let fwdChannel: string | undefined;
        let fwdPostId: number | undefined;

        if (href) {
          const match = href.match(/t\.me\/([^/]+)(?:\/(\d+))?/);
          if (match) {
            fwdChannel = match[1];
            if (match[2]) fwdPostId = parseInt(match[2], 10);
          }
        }

        if (name || fwdChannel) {
          forwardFrom = {
            name: name || (fwdChannel ? `@${fwdChannel}` : "Forwarded Source"),
            channel: fwdChannel,
            postId: fwdPostId,
            url: href || (fwdChannel ? `https://t.me/${fwdChannel}` : undefined),
          };
        }
      }

      // Reply-to detection
      const $reply = $(el).find(".tgme_widget_message_reply");
      let replyTo = undefined;
      if ($reply.length > 0) {
        const replyHref = $reply.attr("href");
        const replyAuthor = $reply.find(".tgme_widget_message_author_name").text().trim();
        const replyText = $reply.find(".tgme_widget_message_text").text().trim();
        let replyId: number | undefined;
        let replyChannel: string | undefined;

        if (replyHref) {
          const match = replyHref.match(/t\.me\/([^/]+)\/(\d+)/);
          if (match) {
            replyChannel = match[1];
            replyId = parseInt(match[2], 10);
          }
        }

        replyTo = {
          id: replyId,
          channel: replyChannel || username,
          authorName: replyAuthor || undefined,
          text: replyText || undefined,
          url: replyHref || (replyId ? `https://t.me/${username}/${replyId}` : undefined),
        };
      }

      messages.push({
        id,
        channel: username,
        date,
        text,
        views: viewsText || undefined,
        media,
        forwardFrom,
        replyTo,
        rawHtml: $.html(el),
      });
    });
    return messages;
  }
}
