import { mkdir, writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Channel, Message } from "./models/types.js";

export interface ChannelSnapshot {
  channel: Channel;
  messages: Message[];
  savedAt: string;
}

const DATA_DIR = join(process.cwd(), "data", "channels");

export class ChannelStore {
  private readonly dir: string;

  constructor(dir: string = DATA_DIR) {
    this.dir = dir;
  }

  async save(channel: Channel, messages: Message[]): Promise<string> {
    await mkdir(this.dir, { recursive: true });
    const path = join(this.dir, `${channel.username}.json`);
    const existing = await this.load(channel.username);
    const merged = existing
      ? [...existing.messages, ...messages].filter(
          (m, i, arr) => arr.findIndex((x) => x.id === m.id) === i,
        ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      : [...messages].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const snapshot: ChannelSnapshot = { channel, messages: merged, savedAt: new Date().toISOString() };
    await writeFile(path, JSON.stringify(snapshot, null, 2));
    return path;
  }

  async load(username: string): Promise<ChannelSnapshot | null> {
    try {
      const raw = await readFile(join(this.dir, `${username}.json`), "utf8");
      return JSON.parse(raw) as ChannelSnapshot;
    } catch {
      return null;
    }
  }
}
