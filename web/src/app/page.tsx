'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Post, TrackedChannel } from '@/lib/types';
import { PostCard } from '@/components/post-card';
import { BabiometerWidget } from '@/components/babiometer-widget';
import { useRealtime, useToast } from '@/components/providers';
import { Search, Radio, Loader2, ArrowUpRight, Newspaper } from 'lucide-react';
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
        showToast('Error retrieving kingdom dispatches', 'error');
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
      {/* Frontpage Broadsheet Masthead Banner */}
      <div className="p-6 sm:p-8 bg-[#12141c] border-2 border-[#262936] shadow-[4px_4px_0px_0px_#000000] flex flex-col gap-3">
        <div className="flex items-center justify-between font-teletype text-[10px] uppercase text-[#a39e93] border-b border-[#262936] pb-2">
          <span>§ TELEGRAM COMMUNITY LURKER SERVICE</span>
          <span>EST. MMXXVI</span>
          <span>EDITION: MULTI-CHANNEL</span>
        </div>

        <div className="flex flex-col gap-1 py-1">
          <h1 className="font-broadsheet font-black text-3xl sm:text-5xl text-[#f4f0e6] tracking-tight uppercase">
            The Lurkening
          </h1>
          <p className="font-teletype text-xs sm:text-sm text-[#d6d0c2] leading-relaxed max-w-2xl">
            Lurk on any Telegram channel without noise fatigue. Real-time multi-channel broadcast ledger with Groq Llama-3.3 AI synthesis and community inquest.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#262936]">
          <Link
            href="/channels"
            className="stamp-btn flex items-center gap-1.5"
          >
            <Radio className="w-3.5 h-3.5" />
            <span>EXAMINE CHANNELS</span>
          </Link>
          <a
            href="https://t.me/lurklord_bot"
            target="_blank"
            rel="noopener noreferrer"
            className="stamp-btn !bg-[#12141c] !text-[#a39e93] hover:!text-[#f4f0e6] flex items-center gap-1"
          >
            <span>@lurklord_bot</span>
            <ArrowUpRight className="w-3 h-3 text-[#d97706]" />
          </a>
        </div>
      </div>

      {/* Teletype Activity Chronometer */}
      <BabiometerWidget channel={selectedChannel === 'all' ? (channels[0]?.id || 'dagmawi_babi') : selectedChannel} />

      {/* Teletype Filter & Search Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 font-teletype">
        {/* Channel Selection Stamps */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
          <button
            onClick={() => setSelectedChannel('all')}
            className={`px-3 py-1.5 text-xs font-bold uppercase border transition-colors shrink-0 ${
              selectedChannel === 'all'
                ? 'bg-[#f4f0e6] text-[#0c0d10] border-[#f4f0e6] shadow-[2px_2px_0px_0px_#000000]'
                : 'bg-[#12141c] text-[#a39e93] border-[#262936] hover:border-[#f4f0e6] hover:text-[#f4f0e6]'
            }`}
          >
            [ ALL CHANNELS ]
          </button>
          {channels.map((ch) => (
            <button
              key={ch.id}
              onClick={() => setSelectedChannel(ch.id)}
              className={`px-3 py-1.5 text-xs font-bold uppercase border transition-colors shrink-0 ${
                selectedChannel === ch.id
                  ? 'bg-[#f4f0e6] text-[#0c0d10] border-[#f4f0e6] shadow-[2px_2px_0px_0px_#000000]'
                  : 'bg-[#12141c] text-[#a39e93] border-[#262936] hover:border-[#f4f0e6] hover:text-[#f4f0e6]'
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
            placeholder="FILTER DISPATCHES..."
            className="w-full py-1.5 pl-8 pr-3 bg-[#12141c] border border-[#262936] text-xs text-[#f4f0e6] placeholder-[#6b665c] font-teletype uppercase focus:outline-none focus:border-[#f4f0e6]"
          />
          <Search className="w-3.5 h-3.5 text-[#a39e93] absolute left-2.5 top-2.5" />
        </div>
      </div>

      {/* Broadsheet Posts Feed */}
      <div className="flex flex-col gap-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2 text-[#a39e93] font-teletype">
            <Loader2 className="w-6 h-6 animate-spin text-[#d97706]" />
            <span className="text-xs tracking-wider uppercase">[ DECODING TELETYPE WIRES... ]</span>
          </div>
        ) : posts.length === 0 ? (
          <div className="broadsheet-card p-12 text-center flex flex-col items-center justify-center gap-2 font-teletype">
            <h3 className="font-bold text-sm text-[#f4f0e6] uppercase">[ NO DISPATCHES FOUND ]</h3>
            <p className="text-xs text-[#a39e93] max-w-sm">
              {searchQuery
                ? `NO RECORDS MATCHED "${searchQuery.toUpperCase()}".`
                : 'NO TRANSMISSIONS LOGGED FOR THIS CHANNEL.'}
            </p>
          </div>
        ) : (
          <>
            {posts.map((post) => (
              <PostCard key={`${post.channel}-${post.id}`} post={post} />
            ))}

            {/* Pagination Button */}
            {hasMore && (
              <div className="flex justify-center pt-3">
                <button
                  onClick={() => fetchPosts(page + 1)}
                  disabled={loadingMore}
                  className="stamp-btn !py-2.5 !px-6 flex items-center gap-2"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>RETRIEVING NEXT PARCHMENT...</span>
                    </>
                  ) : (
                    <span>LOAD MORE BROADSHEET DISPATCHES ↓</span>
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
