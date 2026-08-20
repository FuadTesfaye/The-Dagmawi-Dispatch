'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

// In-memory cache store
const memoryCache = new Map<string, CacheEntry<any>>();

// In-flight promise store for request deduplication
const inFlightRequests = new Map<string, Promise<any>>();

// Cache event subscribers for SWR updates
const cacheSubscribers = new Map<string, Set<(data: any) => void>>();

const DEFAULT_TTL_MS = 3 * 60 * 1000; // 3 minutes fresh cache

/** Get data from cache if present */
export function getCached<T>(key: string): { data: T | null; isStale: boolean } {
  const entry = memoryCache.get(key);
  if (!entry) return { data: null, isStale: true };

  const isStale = Date.now() - entry.timestamp > entry.ttl;
  return { data: entry.data as T, isStale };
}

/** Set data directly in cache and notify subscribers */
export function setCached<T>(key: string, data: T, ttl = DEFAULT_TTL_MS): void {
  memoryCache.set(key, { data, timestamp: Date.now(), ttl });
  const subs = cacheSubscribers.get(key);
  if (subs) {
    subs.forEach((cb) => cb(data));
  }
}

/** Mutate cache optimistically matching a key or pattern */
export function mutateCache<T>(keyOrPattern: string | RegExp, updater: (prev: T) => T): void {
  memoryCache.forEach((entry, key) => {
    const matches =
      typeof keyOrPattern === 'string'
        ? key === keyOrPattern
        : keyOrPattern.test(key);

    if (matches && entry.data) {
      const updated = updater(entry.data);
      setCached(key, updated, entry.ttl);
    }
  });
}

/** Fetch data with deduplication and caching */
export async function fetchWithCache<T>(url: string, ttl = DEFAULT_TTL_MS): Promise<T> {
  const { data, isStale } = getCached<T>(url);

  // If in-flight request already exists for this exact URL, reuse it
  if (inFlightRequests.has(url)) {
    return inFlightRequests.get(url)!;
  }

  // If we have fresh cached data, return immediately
  if (data && !isStale) {
    return data;
  }

  // Initiate request
  const requestPromise = (async () => {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setCached(url, json, ttl);
      return json as T;
    } finally {
      inFlightRequests.delete(url);
    }
  })();

  inFlightRequests.set(url, requestPromise);

  // If we had stale data, return it while request runs in background
  if (data) {
    return data;
  }

  return requestPromise;
}

/** Background prefetch for instant navigation */
export function prefetch(url: string, ttl = DEFAULT_TTL_MS): void {
  if (typeof window === 'undefined') return;
  const { data, isStale } = getCached(url);
  if (!data || isStale) {
    fetchWithCache(url, ttl).catch(() => {});
  }
}

interface UseQueryOptions {
  ttl?: number;
  enabled?: boolean;
  onSuccess?: (data: any) => void;
}

/**
 * High-performance SWR Hook
 * - Returns cached data instantly (0ms latency, zero spinners)
 * - Automatically revalidates in the background
 * - Deduplicates in-flight requests across mounted components
 */
export function useQuery<T>(url: string | null, options: UseQueryOptions = {}) {
  const { ttl = DEFAULT_TTL_MS, enabled = true, onSuccess } = options;

  // Initialize with cached data if present
  const initialCache = url ? getCached<T>(url) : { data: null, isStale: true };

  const [data, setData] = useState<T | null>(initialCache.data);
  const [loading, setLoading] = useState<boolean>(enabled && !initialCache.data && !!url);
  const [isRevalidating, setIsRevalidating] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const isMountedRef = useRef(true);
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const executeFetch = useCallback(
    async (force = false) => {
      if (!url || !enabled) return;

      const { data: cachedData, isStale } = getCached<T>(url);

      if (cachedData && !force && !isStale) {
        setData(cachedData);
        setLoading(false);
        return;
      }

      if (cachedData) {
        setData(cachedData);
        setLoading(false);
        setIsRevalidating(true);
      } else {
        setLoading(true);
      }

      try {
        const fresh = await fetchWithCache<T>(url, ttl);
        if (isMountedRef.current) {
          setData(fresh);
          setError(null);
          onSuccessRef.current?.(fresh);
        }
      } catch (err: any) {
        if (isMountedRef.current) {
          setError(err);
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
          setIsRevalidating(false);
        }
      }
    },
    [url, enabled, ttl]
  );

  // Subscribe to cache updates for this key
  useEffect(() => {
    if (!url) return;

    if (!cacheSubscribers.has(url)) {
      cacheSubscribers.set(url, new Set());
    }
    const subs = cacheSubscribers.get(url)!;
    const updateHandler = (newData: T) => {
      if (isMountedRef.current) {
        setData(newData);
        setLoading(false);
      }
    };
    subs.add(updateHandler);

    return () => {
      subs.delete(updateHandler);
      if (subs.size === 0) cacheSubscribers.delete(url);
    };
  }, [url]);

  useEffect(() => {
    executeFetch();
  }, [executeFetch]);

  const mutate = useCallback(
    (updater: (prev: T | null) => T) => {
      if (!url) return;
      const updated = updater(data);
      setData(updated);
      setCached(url, updated, ttl);
    },
    [url, data, ttl]
  );

  return {
    data,
    loading,
    isRevalidating,
    error,
    refetch: () => executeFetch(true),
    mutate,
  };
}
