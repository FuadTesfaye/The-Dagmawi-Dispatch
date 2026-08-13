export interface Env {
  // Bindings
}

const SUPABASE_URLS = [
  "https://rvhsolhsjtcymttmamgu.supabase.co",
  "https://kfxzidxytryigstjowoy.supabase.co",
  "https://wfebapwyrqxuuouainiv.supabase.co",
];

let currentIndex = 0;

// Simple circuit-breaker state (per worker instance)
let failureCount = 0;
let circuitOpenUntil = 0; // epoch ms
const FAILURE_THRESHOLD = 5; // open circuit after N consecutive failures
const CIRCUIT_OPEN_MS = 30_000; // duration to keep circuit open

/**
 * Cloudflare Worker Load Balancer with retries and a lightweight circuit-breaker
 */
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const now = Date.now();
    if (circuitOpenUntil > now) {
      return new Response('Service temporarily unavailable', { status: 503 });
    }

    const url = new URL(request.url);

    // Try a few attempts with exponential backoff, rotating backends on error
    const maxAttempts = 3;
    let lastErr: unknown = null;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const targetBaseUrl = SUPABASE_URLS[currentIndex];
      currentIndex = (currentIndex + 1) % SUPABASE_URLS.length;
      const targetUrl = new URL(url.pathname + url.search, targetBaseUrl);
      const proxyRequest = new Request(targetUrl.toString(), request);

      try {
        const resp = await fetch(proxyRequest, { cf: { cacheTtl: 0 } });
        if (resp.status >= 500) {
          lastErr = `upstream ${resp.status}`;
          // treat server errors as failures to trigger retry
          throw new Error(String(resp.status));
        }
        // success: reset failure counter
        failureCount = 0;
        return resp;
      } catch (err) {
        lastErr = err;
        failureCount += 1;
        // when threshold exceeded, open circuit
        if (failureCount >= FAILURE_THRESHOLD) {
          circuitOpenUntil = Date.now() + CIRCUIT_OPEN_MS;
          return new Response('Service temporarily unavailable', { status: 503 });
        }
        // jittered exponential backoff before next attempt
        const backoff = Math.pow(2, attempt) * 100 + Math.floor(Math.random() * 100);
        await new Promise((r) => setTimeout(r, backoff));
        continue;
      }
    }

    return new Response('Upstream error', { status: 502 });
  },
};
