// Server-side client for the FastAPI backend. Used only inside route handlers
// and server components — FASTAPI_URL is never shipped to the browser.

import type {
  ChannelDetail,
  ChannelSummary,
  CategoryOut,
  StatsOut,
  GraphOut,
  HubOut,
  ClusterOut,
} from "./types";

const BASE = process.env.FASTAPI_URL ?? "http://localhost:8000";

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function get<T>(path: string, revalidateTime?: number): Promise<T> {
  let revalidate = revalidateTime;
  if (revalidate === undefined) {
    if (path.startsWith('/stats') || path.startsWith('/categories') || path.startsWith('/graph/hubs')) {
      revalidate = 3600; // 1 hour for slowly changing data
    } else if (path.startsWith('/search') || path.startsWith('/channel/')) {
      revalidate = 60; // 60 seconds for search and detail pages
    } else {
      revalidate = 300; // 5 minutes default
    }
  }

  const res = await fetch(`${BASE}${path}`, {
    next: { revalidate },
    headers: { accept: "application/json" },
  });
  if (!res.ok) {
    throw new ApiError(res.status, `backend ${res.status} for ${path}`);
  }
  return (await res.json()) as T;
}

export function searchChannels(q: string, limit = 20): Promise<ChannelSummary[]> {
  const qs = new URLSearchParams({ q, limit: String(limit) });
  return get<ChannelSummary[]>(`/search?${qs.toString()}`);
}

export function getChannel(id: number): Promise<ChannelDetail> {
  return get<ChannelDetail>(`/channel/${id}`);
}

export function listCategories(): Promise<CategoryOut[]> {
  return get<CategoryOut[]>(`/categories`);
}

export function getStats(): Promise<StatsOut> {
  return get<StatsOut>(`/stats`);
}

export function getGraph(limit = 250, clusterId?: number): Promise<GraphOut> {
  const qs = new URLSearchParams({ limit: String(limit) });
  if (clusterId != null) qs.set("cluster_id", String(clusterId));
  return get<GraphOut>(`/graph?${qs.toString()}`);
}

export function getHubs(limit = 20): Promise<HubOut[]> {
  return get<HubOut[]>(`/graph/hubs?limit=${limit}`);
}

export function getBridges(limit = 20): Promise<HubOut[]> {
  return get<HubOut[]>(`/graph/bridges?limit=${limit}`);
}

export function getClusters(): Promise<ClusterOut[]> {
  return get<ClusterOut[]>(`/graph/clusters`);
}

export { ApiError };
