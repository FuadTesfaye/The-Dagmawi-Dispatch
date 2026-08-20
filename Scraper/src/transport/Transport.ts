export interface TransportHooks {
  onRequest?: (url: string) => void;
  onResponse?: (url: string, status: number) => void;
}

export interface TransportOptions {
  timeoutMs?: number;
  maxRetries?: number;
  /** SOCKS or HTTP proxy URL. Requires the optional `socks-proxy-agent` package for SOCKS. */
  proxyUrl?: string;
  hooks?: TransportHooks;
}

/**
 * Handles HTTP connections to t.me: request pacing, retries, proxying, and
 * request/response observability hooks.
 *
 * TODO(Phase 1): implement fetch-based GET with retry/backoff, timeout via
 * AbortController, and proxy agent wiring (undici ProxyAgent / socks-proxy-agent).
 */
const DEFAULT_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; TeleGlance-TS/0.1)",
  Accept: "text/html",
};

export class Transport {
  private readonly options: TransportOptions;

  constructor(options: TransportOptions = {}) {
    this.options = options;
  }

  async get(url: string): Promise<string> {
    const { timeoutMs = 10_000, maxRetries = 3, hooks } = this.options;
    let attempt = 0;
    while (true) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      hooks?.onRequest?.(url);
      try {
        const res = await fetch(url, { headers: DEFAULT_HEADERS, signal: controller.signal });
        hooks?.onResponse?.(url, res.status);
        if (res.status === 429) {
          const retryAfter = Number(res.headers.get("retry-after") ?? 0) * 1000;
          throw Object.assign(new Error("rate-limited"), { retryAfterMs: retryAfter });
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      } catch (err) {
        if (++attempt >= maxRetries) throw err;
        await new Promise((r) => setTimeout(r, 500 * attempt));
      } finally {
        clearTimeout(timer);
      }
    }
  }
}
