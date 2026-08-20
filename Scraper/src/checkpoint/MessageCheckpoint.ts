export interface MessageCheckpointData {
  channel: string;
  oldestId?: number;
  newestId?: number;
  updatedAt: string;
}

/**
 * Tracks pagination bounds for resumable `iterMessages()` collection.
 *
 * TODO(Phase 7): implement `record()` to extend oldest/newest bounds from a
 * newly seen message ID.
 */
export class MessageCheckpoint {
  public readonly channel: string;
  public oldestId?: number;
  public newestId?: number;
  public updatedAt: Date;

  constructor(channel: string, oldestId?: number, newestId?: number, updatedAt: Date = new Date()) {
    this.channel = channel;
    this.oldestId = oldestId;
    this.newestId = newestId;
    this.updatedAt = updatedAt;
  }

  record(_messageId: number): MessageCheckpoint {
    throw new Error("MessageCheckpoint.record() is not implemented yet — see Phase 7.");
  }

  toJSON(): MessageCheckpointData {
    return {
      channel: this.channel,
      oldestId: this.oldestId,
      newestId: this.newestId,
      updatedAt: this.updatedAt.toISOString(),
    };
  }
}

export interface CheckpointStore {
  load(key: string): Promise<MessageCheckpoint | null>;
  save(key: string, checkpoint: MessageCheckpoint): Promise<void>;
}

/**
 * Filesystem-backed checkpoint store, keyed by an arbitrary string
 * (e.g. `history:nahomssandbox`).
 *
 * TODO(Phase 7): implement JSON read/write against `filePath`.
 */
export class JsonCheckpointStore implements CheckpointStore {
  private readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  async load(_key: string): Promise<MessageCheckpoint | null> {
    void this.filePath;
    throw new Error("JsonCheckpointStore.load() is not implemented yet — see Phase 7.");
  }

  async save(_key: string, _checkpoint: MessageCheckpoint): Promise<void> {
    throw new Error("JsonCheckpointStore.save() is not implemented yet — see Phase 7.");
  }
}
