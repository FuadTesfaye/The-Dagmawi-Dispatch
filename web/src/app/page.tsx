'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Post, TrackedChannel } from '@/lib/types';
import { PostCard } from '@/components/post-card';
import { BabiometerWidget } from '@/components/babiometer-widget';
import { useRealtime, useToast } from '@/components/providers';
import { Sparkles, Search, Radio, Filter, RefreshCw, Flame, Loader2, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  const { subscribe } = useRealtime();
  const { showToast } = useToast();

  const [posts, setPosts] = useState<Post[]>([]);
  const [channels, setChannels] = useState<TrackedChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);

  // Fetch Channels
  useEffect(() => {
    fetch('/api/channels')
      .then((res) => res.json())
      .then((data) => {
        if (data.channels) {
          setChannels(data.channels);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch Posts
  const fetchPosts = useCallback(
    async (pageNum = 1, isInitial = false) => {
      if (isInitial) setLoading(true);
      else setLoadingMore(true);

      try {
        const queryParams = new URLSearchParams({
          page: String(pageNum),
          limit: '15',
        });
        if (selectedChannel && selectedChannel !== 'all') {
          queryParams.set('channel', selectedChannel);
        }
        if (searchQuery.trim()) {
          queryParams.set('search', searchQuery.trim());
        }

        const res = await fetch(`/api/posts?${queryParams.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (pageNum === 1) {
            setPosts(data.posts || []);
          } else {
            setPosts((prev) => [...prev, ...(data.posts || [])]);
          }
          setHasMore(data.hasMore);
          setPage(pageNum);
        }
      } catch (err) {
        showToast('Error loading scrolls from kingdom', 'error');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [selectedChannel, searchQuery, showToast]
  );

  useEffect(() => {
    fetchPosts(1, true);
  }, [fetchPosts]);

  // Subscribe to real-time events to update feed
  useEffect(() => {
    const unsubscribe = subscribe((event) => {
      if (event.type === 'reaction_update') {
        setPosts((prev) =>
          prev.map((p) => {
            if (p.channel === event.channel && p.id === event.postId) {
              return {
                ...p,
                reactions: event.data.reactions,
              };
            }
            return p;
          })
        );
      } else if (event.type === 'new_comment') {
        setPosts((prev) =>
          prev.map((p) => {
            if (p.channel === event.channel && p.id === event.postId) {
              return {
                ...p,
                commentCount: (p.commentCount || 0) + 1,
              };
            }
            return p;
          })
        );
      }
    });

    return () => unsubscribe();
  }, [subscribe]);

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      {/* Hero Welcome Banner */}
      <div className="p-6 sm:p-8 rounded-3xl glass-panel bg-gradient-to-br from-amber-500/15 via-zinc-900/60 to-zinc-950 border border-amber-500/30 flex flex-col gap-4 relative overflow-hidden shadow-2xl">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold self-start border border-amber-500/40">
          <span>📜</span>
          <span>By Royal Decree</span>
        </div>

        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-zinc-50">
            The Dagmawi Dispatch
          </h1>
          <p className="text-xs sm:text-sm text-zinc-300 max-w-xl leading-relaxed">
            High-velocity Telegram posts aggregated, summarized by AI, and served fresh with live discussions and royal roasts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Link
            href="/channels"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Explore Channels</span>
          </Link>
          <a
            href="https://t.me/BabisummarizeBot"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 transition-colors"
          >
            <span>Open Telegram Bot</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-zinc-400" />
          </a>
        </div>
      </div>

      {/* Top Activity Meter Widget */}
      <BabiometerWidget channel={selectedChannel === 'all' ? 'dagmawi_babi' : selectedChannel} />

      {/* Search & Channel Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Channel Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 no-scrollbar">
          <button
            onClick={() => setSelectedChannel('all')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold shrink-0 transition-all ${
              selectedChannel === 'all'
                ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                : 'bg-zinc-900/80 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
            }`}
          >
            All Channels
          </button>
          {channels.map((ch) => (
            <button
              key={ch.id}
              onClick={() => setSelectedChannel(ch.id)}
              className={`px-4 py-2 rounded-2xl text-xs font-bold shrink-0 transition-all ${
                selectedChannel === ch.id
                  ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                  : 'bg-zinc-900/80 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
              }`}
            >
              @{ch.id}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative shrink-0 sm:w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search kingdom scrolls..."
            className="w-full py-2 pl-9 pr-3 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500/50"
          />
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-3" />
        </div>
      </div>

      {/* Posts Feed */}
      <div className="flex flex-col gap-5">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-amber-400">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="text-xs text-zinc-400">Unrolling the royal parchment...</span>
          </div>
        ) : posts.length === 0 ? (
          <div className="glass-panel rounded-3xl p-12 text-center flex flex-col items-center justify-center gap-3">
            <span className="text-4xl">📜</span>
            <h3 className="font-extrabold text-base text-zinc-100">No scrolls found</h3>
            <p className="text-xs text-zinc-400 max-w-sm">
              {searchQuery
                ? `No posts matched "${searchQuery}". Try a different keyword.`
                : 'No dispatches recorded for this channel yet.'}
            </p>
          </div>
        ) : (
          <>
            {posts.map((post) => (
              <PostCard key={`${post.channel}-${post.id}`} post={post} />
            ))}

            {/* Pagination / Load More */}
            {hasMore && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={() => fetchPosts(page + 1)}
                  disabled={loadingMore}
                  className="px-6 py-2.5 rounded-full text-xs font-bold bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 transition-all flex items-center gap-2"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                      <span>Fetching next parchment...</span>
                    </>
                  ) : (
                    <span>Load More Scrolls ↓</span>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
