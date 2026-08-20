import { Transport, type TransportOptions } from "../transport/Transport.js";
import { ParserRegistry } from "../parsers/index.js";
import { ChannelStore } from "../store.js";
import type { Channel, Media, Message } from "../models/types.js";

export interface TeleGlanceClientOptions extends TransportOptions {
  /** Directory to persist scraped data. Defaults to <cwd>/data/channels. Pass false to disable. */
  storeDir?: string | false;
}

export interface IterMessagesOptions {
  limit?: number;
  before?: number;
}

export interface SearchOptions {
  limit?: number;
}

export interface WatchOptions {
  intervalMs?: number;
}

const BASE = "https://t.me";

export class TeleGlanceClient {
  private readonly transport: Transport;
  private readonly parser: ParserRegistry;
  private readonly store: ChannelStore | null;

  constructor(options: TeleGlanceClientOptions = {}) {
    const { storeDir, ...transportOptions } = options;
    this.transport = new Transport(transportOptions);
    this.parser = new ParserRegistry();
    this.store = storeDir === false ? null : new ChannelStore(storeDir as string | undefined);
  }

  async getChannel(username: string): Promise<Channel> {
    const html = await this.transport.get(`${BASE}/${username}`);
    return this.parser.parseChannel(html, username);
  }

  async getMessage(username: string, id: number): Promise<Message> {
    const html = await this.transport.get(`${BASE}/s/${username}?before=${id + 1}`);
    const msgs = this.parser.parseMessages(html, username);
    const msg = msgs.find((m) => m.id === id);
    if (!msg) throw new Error(`Message ${id} not found in ${username}`);
    return msg;
  }

  async *iterMessages(username: string, options: IterMessagesOptions = {}): AsyncGenerator<Message> {
    const { limit = 20, before } = options;
    let cursor = before;
    let yielded = 0;
    const collected: Message[] = [];
    while (yielded < limit) {
      const url = cursor ? `${BASE}/s/${username}?before=${cursor}` : `${BASE}/s/${username}`;
      const html = await this.transport.get(url);
      const msgs = this.parser.parseMessages(html, username);
      if (msgs.length === 0) break;
      for (const msg of [...msgs].reverse()) {
        if (yielded >= limit) break;
        collected.push(msg);
        yield msg;
        yielded++;
      }
      cursor = msgs[0]!.id;
    }
    if (this.store && collected.length > 0) {
      const channel = await this.getChannel(username);
      await this.store.save(channel, collected);
    }
  }

  /**
   * Scrapes every message from the channel's first post to the latest,
   * persisting in batches as it goes. Yields each message in chronological order.
   */
  async *scrapeAll(username: string): AsyncGenerator<Message> {
    const channel = await this.getChannel(username);
    // t.me/s paginates backwards; walk from latest down to id=1
    let cursor: number | undefined = undefined;
    let done = false;
    while (!done) {
      const url = cursor ? `${BASE}/s/${username}?before=${cursor}` : `${BASE}/s/${username}`;
      const html = await this.transport.get(url);
      const msgs = this.parser.parseMessages(html, username);
      if (msgs.length === 0) break;
      // msgs is newest-first from the page; oldest msg on this page
      const oldest = msgs[0]!;
      if (oldest.id <= 1) done = true;
      // yield in chronological order (oldest first)
      for (const msg of [...msgs].reverse()) {
        yield msg;
      }
      if (this.store) await this.store.save(channel, [...msgs].reverse());
      cursor = oldest.id;
    }
  }

  async *search(_username: string, _query: string, _options: SearchOptions = {}): AsyncGenerator<Message> {
    throw new Error("search() is not implemented yet — see Phase 5 in the roadmap.");
  }

  async *watch(_username: string, _options: WatchOptions = {}): AsyncGenerator<Message> {
    throw new Error("watch() is not implemented yet — see Phase 5 in the roadmap.");
  }

  async downloadMedia(_media: Media, _dest: string): Promise<string> {
    throw new Error("downloadMedia() is not implemented yet — see Phase 6 in the roadmap.");
  }

  async downloadBytes(_media: Media): Promise<Uint8Array> {
    throw new Error("downloadBytes() is not implemented yet — see Phase 6 in the roadmap.");
  }

  async close(): Promise<void> {}
}
