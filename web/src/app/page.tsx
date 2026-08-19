'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Post, TrackedChannel } from '@/lib/types';
import { PostCard } from '@/components/post-card';
import { BabiometerWidget } from '@/components/babiometer-widget';
import { useRealtime, useToast } from '@/components/providers';
import { Search, Radio, Loader2, ArrowUpRight } from 'lucide-react';
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
        showToast('Error loading dispatches', 'error');
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
    <div className="flex flex-col gap-6 max-w-3xl mx-auto">
      {/* Editorial Header */}
      <div className="flex flex-col gap-2 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">
            Publication Feed
          </span>
          <span className="w-1 h-1 rounded-full bg-zinc-600" />
          <span className="text-[11px] text-zinc-500 font-medium">Real-Time Ingestion</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          The Dagmawi Dispatch
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-xl">
          Aggregated Telegram broadcasts, indexed and summarized with multi-model AI synthesis.
        </p>
      </div>

      {/* Activity Index Widget */}
      <BabiometerWidget channel={selectedChannel === 'all' ? 'dagmawi_babi' : selectedChannel} />

      {/* Search & Channel Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        {/* Channel Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
          <button
            onClick={() => setSelectedChannel('all')}
            className={`px-3 py-1.5 rounded-lg text-xs transition-colors shrink-0 ${
              selectedChannel === 'all'
                ? 'bg-zinc-100 text-zinc-950 font-semibold'
                : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
            }`}
          >
            All Channels
          </button>
          {channels.map((ch) => (
            <button
              key={ch.id}
              onClick={() => setSelectedChannel(ch.id)}
              className={`px-3 py-1.5 rounded-lg text-xs transition-colors shrink-0 ${
                selectedChannel === ch.id
                  ? 'bg-zinc-100 text-zinc-950 font-semibold'
                  : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
              }`}
            >
              @{ch.id}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative shrink-0 sm:w-60">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search dispatches..."
            className="w-full py-1.5 pl-8 pr-3 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
          />
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
        </div>
      </div>

      {/* Posts Feed */}
      <div className="flex flex-col gap-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2 text-zinc-500">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
            <span className="text-xs font-medium">Loading publication feed...</span>
          </div>
        ) : posts.length === 0 ? (
          <div className="editorial-card p-12 text-center flex flex-col items-center justify-center gap-2">
            <h3 className="font-semibold text-sm text-zinc-200">No dispatches found</h3>
            <p className="text-xs text-zinc-500 max-w-sm">
              {searchQuery
                ? `No posts matched "${searchQuery}".`
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
              <div className="flex justify-center pt-2">
                <button
                  onClick={() => fetchPosts(page + 1)}
                  disabled={loadingMore}
                  className="px-5 py-2 rounded-lg text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 transition-colors flex items-center gap-2"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400" />
                      <span>Loading...</span>
                    </>
                  ) : (
                    <span>Load More Dispatches</span>
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
