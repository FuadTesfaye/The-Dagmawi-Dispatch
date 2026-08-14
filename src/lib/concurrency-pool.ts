/**
 * In-process concurrency limiter for serverless handlers.
 * Caps simultaneous expensive work (AI, scrapes, webhook handlers).
 */
export class ConcurrencyPool {
  private active = 0;
  private queue: Array<() => void> = [];

  constructor(private readonly maxConcurrent: number) {
    if (maxConcurrent < 1) throw new Error("maxConcurrent must be >= 1");
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }

  private acquire(): Promise<void> {
    if (this.active < this.maxConcurrent) {
      this.active++;
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.queue.push(() => {
        this.active++;
        resolve();
      });
    });
  }

  private release(): void {
    this.active--;
    const next = this.queue.shift();
    if (next) next();
  }

  get stats() {
    return { active: this.active, queued: this.queue.length, max: this.maxConcurrent };
  }
}

const envInt = (key: string, fallback: number) => {
  const n = Number(process.env[key]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

/** Max concurrent webhook / API handlers (target: ~100 users). */
export const handlerPool = new ConcurrencyPool(envInt("MAX_CONCURRENT_HANDLERS", 100));
/** Max concurrent Groq calls across the instance. */
export const aiPool = new ConcurrencyPool(envInt("MAX_CONCURRENT_AI", 50));
/** Max concurrent Telegram web scrapes. */
export const scrapePool = new ConcurrencyPool(envInt("MAX_CONCURRENT_SCRAPES", 25));
