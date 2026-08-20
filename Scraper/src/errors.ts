export class TeleGlanceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class ChannelNotFoundError extends TeleGlanceError {
  constructor(channel: string) {
    super(`Channel not found: ${channel}`);
  }
}

export class ChannelPrivateError extends TeleGlanceError {
  constructor(channel: string) {
    super(`Channel is private: ${channel}`);
  }
}

export class ParseError extends TeleGlanceError {}

export class RateLimitedError extends TeleGlanceError {
  public readonly retryAfterMs?: number;

  constructor(retryAfterMs?: number) {
    super("Rate limited by t.me");
    this.retryAfterMs = retryAfterMs;
  }
}
