export interface Env {
  // Bindings
}

const SUPABASE_URLS = [
  "https://rvhsolhsjtcymttmamgu.supabase.co",
  "https://kfxzidxytryigstjowoy.supabase.co",
  "https://wfebapwyrqxuuouainiv.supabase.co"
];

let currentIndex = 0;

/**
 * Cloudflare Worker Load Balancer
 * Distributes incoming traffic across the 3 Supabase instances.
 */
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    
    // Pick the next Supabase instance
    const targetBaseUrl = SUPABASE_URLS[currentIndex];
    currentIndex = (currentIndex + 1) % SUPABASE_URLS.length;
    
    // Rewrite the request URL to point to the selected Supabase backend
    const targetUrl = new URL(url.pathname + url.search, targetBaseUrl);
    
    // Create a new request based on the incoming request but pointing to Supabase
    const proxyRequest = new Request(targetUrl.toString(), request);
    
    // Forward the request and return the response
    return fetch(proxyRequest);
  },
};
