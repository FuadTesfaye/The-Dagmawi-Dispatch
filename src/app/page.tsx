'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Post, TrackedChannel } from '@/lib/types';
import { PostCard } from '@/components/post-card';
import { BabiometerWidget } from '@/components/babiometer-widget';
import { CrossChannelDigestCard } from '@/components/cross-channel-digest-card';
import { RoastBattleCard } from '@/components/roast-battle-card';
import { WeeklyLeaderboardWidget } from '@/components/weekly-leaderboard-widget';
import { FeedTagFilter } from '@/components/feed-tag-filter';
import { useRealtime, useToast, useAuth } from '@/components/providers';
import {
  Search,
  Radio,
  Loader2,
  ArrowUpRight,
  Bot,
  Sparkles,
  Check,
  Plus,
  Compass,
  Zap,
  Newspaper,
} from 'lucide-react';
import Link from 'next/link';

import { SearchModal } from '@/components/search-modal';
import { TELEGRAM_BOT_USERNAME } from '@/lib/constants';
import { fetchWithCache, getCached } from '@/lib/cache';

export default function HomePage() {
  const { subscribe, isConnected } = useRealtime();
  const { showToast } = useToast();
  const { user, isTelegramWebApp } = useAuth();

  // Instant SWR cache initialization
  const initialChannels = getCached<{ channels: TrackedChannel[] }>('/api/channels').data?.channels || [];
  const initialPosts = getCached<{ posts: Post[]; hasMore: boolean }>('/api/posts?page=1&limit=15').data?.posts || [];

  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [channels, setChannels] = useState<TrackedChannel[]>(initialChannels);
  const [selectedChannel, setSelectedChannel] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'feed' | 'catchup'>('feed');
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(initialPosts.length === 0);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const botUsername = TELEGRAM_BOT_USERNAME;

  // Fetch Channels with SWR cache
  useEffect(() => {
    fetchWithCache<{ channels: TrackedChannel[] }>('/api/channels')
      .then((data) => {
        if (data?.channels) {
          setChannels(data.channels);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch Posts with SWR cache & topic tag filtering
  const fetchPosts = useCallback(
    async (pageNum = 1, isInitial = false) => {
      const queryParams = new URLSearchParams({
        page: String(pageNum),
        limit: '15',
      });
      if (selectedChannel && selectedChannel !== 'all') {
        queryParams.set('channel', selectedChannel);
      }
      if (selectedTag && selectedTag !== 'all') {
        queryParams.set('tag', selectedTag);
      }
      if (searchQuery.trim()) {
        queryParams.set('search', searchQuery.trim());
      }

      const cacheKey = `/api/posts?${queryParams.toString()}`;
      const cached = getCached<{ posts: Post[]; hasMore: boolean }>(cacheKey);

      if (isInitial) {
        if (cached.data) {
          setPosts(cached.data.posts || []);
          setHasMore(cached.data.hasMore ?? true);
          setLoading(false);
        } else {
          setLoading(true);
        }
      } else {
        setLoadingMore(true);
      }

      try {
        const data = await fetchWithCache<{ posts: Post[]; hasMore: boolean }>(cacheKey);
        if (data) {
          if (pageNum === 1) {
            setPosts(data.posts || []);
          } else {
            setPosts((prev) => [...prev, ...(data.posts || [])]);
          }
          setHasMore(data.hasMore ?? true);
          setPage(pageNum);
        }
      } catch {
        showToast('Error retrieving dispatches', 'error');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [selectedChannel, selectedTag, searchQuery, showToast]
  );

  useEffect(() => {
    fetchPosts(1, true);
  }, [fetchPosts]);

  // Real-time events
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

  const handleFollowChannel = async (channelId: string, isCurrentlySubscribed: boolean) => {
    if (!user) {
      showToast('Sign in to follow channels', 'info');
      return;
    }

    try {
      const res = await fetch(`/api/channels/${channelId}/subscribe`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setChannels((prev) =>
          prev.map((ch) =>
            ch.id === channelId
              ? { ...ch, isSubscribed: data.isSubscribed, subscriberCount: data.subscriberCount }
              : ch
          )
        );
        showToast(
          data.isSubscribed ? `Now following @${channelId}` : `Unfollowed @${channelId}`,
          'success'
        );
      }
    } catch {
      showToast('Subscription error', 'error');
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2 sm:py-4 flex flex-col gap-4 sm:gap-6 font-sans">
      {/* ─── CLEAN UTILITY HEADER: QUICK CATCH-UP & BOT CALLOUT ───── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[var(--card-bg)] p-4 border border-[var(--ink-border)] rounded-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 border border-[#d97706] bg-[#241c10] text-[#d97706] flex items-center justify-center font-bold text-lg rounded-sm shrink-0">
            §
          </div>
          <div>
            <h1 className="font-bold text-base sm:text-lg text-[var(--paper-cream)]">
              Telegram Channel Intelligence
            </h1>
            <p className="text-xs text-[var(--paper-muted)]">
              Catch up in 60 seconds. Multi-channel AI summaries, search, and real-time feeds.
            </p>
          </div>
        </div>

        {/* View Switcher Tabs: Live Feed vs 60-Sec Catch-Up */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto shrink-0">
          <button
            onClick={() => setViewMode('feed')}
            className={`flex-1 sm:flex-initial px-3.5 py-1.5 text-xs font-bold transition-all rounded-sm flex items-center justify-center gap-1.5 ${
              viewMode === 'feed'
                ? 'bg-[var(--paper-cream)] text-[var(--ink-bg)] shadow-sm'
                : 'bg-[var(--subtle-bg)] text-[var(--paper-muted)] hover:text-[var(--paper-cream)] border border-[var(--ink-border)]'
            }`}
          >
            <Newspaper className="w-3.5 h-3.5" />
            <span>Live Feed</span>
          </button>

          <button
            onClick={() => setViewMode('catchup')}
            className={`flex-1 sm:flex-initial px-3.5 py-1.5 text-xs font-bold transition-all rounded-sm flex items-center justify-center gap-1.5 ${
              viewMode === 'catchup'
                ? 'bg-[#d97706] text-black shadow-sm'
                : 'bg-[var(--subtle-bg)] text-[var(--paper-muted)] hover:text-[#d97706] border border-[var(--ink-border)]'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Today&apos;s Brief</span>
          </button>
        </div>
      </div>

      {/* ─── CATCH-UP BRIEF VIEW (WHEN ACTIVE) ────────────────────── */}
      {viewMode === 'catchup' && (
        <div className="flex flex-col gap-4 animate-in fade-in-50 duration-200">
          <CrossChannelDigestCard />
          <RoastBattleCard />
        </div>
      )}

      {/* ─── LIVE FEED VIEW ──────────────────────────────────────── */}
      {viewMode === 'feed' && (
        <>
          {/* Channel Story Avatar Row */}
          <div className="bg-[var(--card-bg)] p-3 border border-[var(--ink-border)] rounded-sm flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-[var(--paper-muted)]">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Tracked Channels:</span>
              <Link href="/channels" className="text-[#d97706] hover:underline text-xs flex items-center gap-0.5">
                <span>View All ({channels.length})</span>
                <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="flex items-center gap-2.5 overflow-x-auto py-1 no-scrollbar select-none">
              {/* All Channels Pill */}
              <button
                onClick={() => setSelectedChannel('all')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold shrink-0 transition-all ${
                  selectedChannel === 'all'
                    ? 'bg-[#d97706] text-black border-[#d97706]'
                    : 'bg-[var(--subtle-bg)] text-[var(--paper-muted)] border-[var(--ink-border)] hover:text-[var(--paper-cream)]'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>All Channels</span>
              </button>

              {/* Channel Avatars */}
              {channels.map((ch) => {
                const isSelected = selectedChannel === ch.id;
                return (
                  <button
                    key={ch.id}
                    onClick={() => setSelectedChannel(ch.id)}
                    className={`flex items-center gap-2 px-2.5 py-1 rounded-full border text-xs font-medium shrink-0 transition-all ${
                      isSelected
                        ? 'bg-[#d97706] text-black border-[#d97706] font-bold'
                        : 'bg-[var(--subtle-bg)] text-[var(--paper-muted)] border-[var(--ink-border)] hover:text-[var(--paper-cream)]'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={ch.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${ch.id}`}
                      alt={ch.name}
                      className="w-5 h-5 rounded-full object-cover bg-zinc-800"
                    />
                    <span className="truncate max-w-[120px]">{ch.name.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2-Column Grid: Posts Feed + Desktop Sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Main Post Stream */}
            <div className="lg:col-span-8 flex flex-col gap-3.5">
              {/* Topic Tag Filtering Bar */}
              <FeedTagFilter
                activeTag={selectedTag}
                onSelectTag={(t) => setSelectedTag(t)}
              />

              {/* Inline Quick Search & Feed Status */}
              <div className="flex items-center justify-between gap-2 bg-[var(--subtle-bg)] p-2 border border-[var(--ink-border)] rounded-sm">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search dispatches in current feed..."
                    className="w-full py-1 pl-8 pr-3 bg-transparent text-xs text-[var(--paper-cream)] placeholder-[var(--paper-faint)] focus:outline-none"
                  />
                  <Search className="w-3.5 h-3.5 text-[var(--paper-muted)] absolute left-2.5 top-2" />
                </div>

                {selectedChannel !== 'all' && (
                  <button
                    onClick={() => setSelectedChannel('all')}
                    className="text-xs text-[#d97706] hover:underline font-mono"
                  >
                    Reset Filter
                  </button>
                )}
              </div>

              {/* Posts Stream */}
              <div className="flex flex-col gap-3.5">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-2 text-[var(--paper-muted)]">
                    <Loader2 className="w-6 h-6 animate-spin text-[#d97706]" />
                    <span className="text-xs font-mono">Loading telegram dispatches...</span>
                  </div>
                ) : posts.length === 0 ? (
                  <div className="broadsheet-card p-10 text-center flex flex-col items-center justify-center gap-2">
                    <h3 className="font-bold text-sm text-[var(--paper-cream)]">No dispatches found</h3>
                    <p className="text-xs text-[var(--paper-muted)] max-w-sm">
                      {searchQuery
                        ? `No results matched "${searchQuery}".`
                        : 'No transmissions logged for this filter.'}
                    </p>
                  </div>
                ) : (
                  <>
                    {posts.map((post) => (
                      <PostCard key={`${post.channel}-${post.id}`} post={post} />
                    ))}

                    {/* Pagination Button */}
                    {hasMore && (
                      <div className="flex justify-center pt-2">
                        <button
                          onClick={() => fetchPosts(page + 1)}
                          disabled={loadingMore}
                          className="stamp-btn !py-2.5 !px-6 flex items-center gap-2 w-full sm:w-auto text-xs active:scale-95"
                        >
                          {loadingMore ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Loading more...</span>
                            </>
                          ) : (
                            <span>Load More Dispatches ↓</span>
                          )}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Desktop Right Rail */}
            <aside className="lg:col-span-4 hidden lg:flex flex-col gap-5 sticky top-20">
              {/* Lurkometer Widget */}
              <BabiometerWidget channel={selectedChannel === 'all' ? (channels[0]?.id || 'dagmawi_babi') : selectedChannel} />

              {/* Weekly Honor Roll */}
              <WeeklyLeaderboardWidget />

              {/* Telegram Bot Direct Access */}
              <div className="bg-[var(--card-bg)] p-4 border border-[var(--ink-border)] rounded-sm flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-[#d97706]" />
                    <span className="text-xs font-bold text-[var(--paper-cream)]">Telegram Bot</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-mono">ONLINE</span>
                </div>
                <p className="text-xs text-[var(--paper-muted)] leading-relaxed">
                  Prefer staying in Telegram? Get instant daily digests, channel searches, and AI briefs directly from @{botUsername}.
                </p>
                <a
                  href={`https://t.me/${botUsername}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="stamp-btn !bg-[#d97706] !text-black !border-[#d97706] hover:!bg-[var(--paper-cream)] justify-between !py-2 text-xs active:scale-95 flex items-center"
                >
                  <span>Open @{botUsername}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </aside>
          </div>
        </>
      )}

      {/* Global Search Modal */}
      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
      />
    </div>
  );
}
