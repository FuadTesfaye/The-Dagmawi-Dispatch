export interface Counts {
  subscribers?: string;
  photos?: string;
  videos?: string;
  links?: string;
  files?: string;
}

export interface Channel {
  username: string;
  title: string;
  description?: string;
  avatarUrl?: string;
  counts: Counts;
}

export type MediaType = "photo" | "video" | "sticker" | "poll" | "location";

interface BaseMedia {
  type: MediaType;
}

export interface PhotoMedia extends BaseMedia {
  type: "photo";
  url: string;
  width?: number;
  height?: number;
}

export interface VideoMedia extends BaseMedia {
  type: "video";
  url: string;
  durationSeconds?: number;
  thumbnailUrl?: string;
}

export interface StickerMedia extends BaseMedia {
  type: "sticker";
  url: string;
  emoji?: string;
}

export interface PollOption {
  text: string;
  percent?: number;
}

export interface PollMedia extends BaseMedia {
  type: "poll";
  question: string;
  options: PollOption[];
}

export interface LocationMedia extends BaseMedia {
  type: "location";
  latitude: number;
  longitude: number;
}

export interface ForwardFrom {
  name: string;
  channel?: string;
  postId?: number;
  url?: string;
}

export interface ReplyTo {
  id?: number;
  channel?: string;
  authorName?: string;
  text?: string;
  url?: string;
}

export interface Message {
  id: number;
  channel: string;
  date: Date;
  text: string;
  views?: string;
  media: Media[];
  forwardFrom?: ForwardFrom;
  replyTo?: ReplyTo;
  /** Original markup for this message, preserved for the Raw HTML Fallback strategy. */
  rawHtml: string;
}
