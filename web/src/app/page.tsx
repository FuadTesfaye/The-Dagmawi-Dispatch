'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Post, TrackedChannel } from '@/lib/types';
import { PostCard } from '@/components/post-card';
import { BabiometerWidget } from '@/components/babiometer-widget';
import { useRealtime, useToast, useAuth } from '@/components/providers';
import { Search, Radio, Loader2, ArrowUpRight, Bot, Sparkles, Check, Plus, Users, Compass } from 'lucide-react';
import Link from 'next/link';

import { SearchModal } from '@/components/search-modal';
import { TELEGRAM_BOT_USERNAME } from '@/lib/constants';

export default function HomePage() {
  const { subscribe } = useRealtime();
  const { showToast } = useToast();
  const { user } = useAuth();

  const [posts, setPosts] = useState<Post[]>([]);
  const [channels, setChannels] = useState<TrackedChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const botUsername = TELEGRAM_BOT_USERNAME;

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
      } catch {
        showToast('Error retrieving dispatches', 'error');
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
      showToast('Authentication required to follow channel', 'info');
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
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 flex flex-col gap-6 sm:gap-8 font-teletype">
      {/* Frontpage Broadsheet Masthead Banner */}
      <div className="p-4 sm:p-8 md:p-10 bg-[var(--card-bg)] border-2 border-[var(--ink-border-heavy)] shadow-[4px_4px_0px_0px_var(--shadow-color)] sm:shadow-[6px_6px_0px_0px_var(--shadow-color)] flex flex-col gap-4 sm:gap-6 text-center items-center">
        {/* Scribe Stamp */}
        <div className="inline-flex items-center gap-1.5 sm:gap-2 stamp-badge-gold stamp-badge text-[10px] sm:text-xs">
          <span>§ UNIVERSAL TELEGRAM COMMUNITY LURKER</span>
          <span>·</span>
          <span>ISSUE NO. 88</span>
        </div>

        {/* Masthead Title */}
        <div className="flex flex-col gap-1.5 sm:gap-2">
          <h1 className="font-broadsheet font-black text-3xl sm:text-6xl lg:text-7xl text-[var(--paper-cream)] tracking-tight uppercase">
            The Lurkening
          </h1>
          <p className="font-teletype text-[11px] sm:text-sm text-[var(--paper-muted)] max-w-2xl mx-auto leading-relaxed uppercase">
            Telegram channel monitoring, Groq AI editorial intelligence, and multi-channel discovery.
          </p>
        </div>

        {/* Action Stamps */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 pt-3 border-t border-[var(--ink-border)] w-full">
          <a
            href={`https://t.me/${botUsername}`}
            target="_blank"
            rel="noopener noreferrer"
            className="stamp-btn !bg-[#241c10] !border-[#785a28] !text-[#f6d89b] hover:!bg-[#d97706] hover:!text-black flex items-center gap-1.5 !py-2 !px-3.5 sm:!py-2.5 sm:!px-5 text-xs active:scale-95"
          >
            <Bot className="w-4 h-4 text-[#d97706]" />
            <span>SUMMON @{botUsername}</span>
          </a>

          <button
            onClick={() => setIsSearchModalOpen(true)}
            className="stamp-btn flex items-center gap-1.5 !py-2 !px-3.5 sm:!py-2.5 sm:!px-5 text-xs active:scale-95"
          >
            <Search className="w-4 h-4 text-[#d97706]" />
            <span>SEARCH ARCHIVE & GRAPH</span>
          </button>
        </div>
      </div>

      {/* Stories / Monitored Channels Carousel Bar */}
      <div className="broadsheet-card p-3 sm:p-4 flex flex-col gap-2.5 overflow-hidden">
        <div className="flex items-center justify-between text-[11px] uppercase font-bold text-[var(--paper-muted)] px-1 border-b border-[var(--ink-border)] pb-2">
          <div className="flex items-center gap-1.5 text-[#d97706]">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>Active Telegraph Channels</span>
          </div>
          <Link href="/channels" className="text-[#d97706] hover:underline flex items-center gap-0.5">
            <span>Explore All</span>
            <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Horizontal Swiper Row */}
        <div className="flex items-center gap-3 sm:gap-4 overflow-x-auto py-1 px-1 no-scrollbar select-none">
          {/* 'All' Channel Story Pill */}
          <button
            onClick={() => setSelectedChannel('all')}
            className={`flex flex-col items-center gap-1.5 shrink-0 transition-transform active:scale-95 group focus:outline-none`}
          >
            <div
              className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center border-2 transition-all ${
                selectedChannel === 'all'
                  ? 'border-[#d97706] bg-[#d97706] text-black shadow-[0_0_12px_rgba(217,119,6,0.5)]'
                  : 'border-[var(--ink-border)] bg-[var(--subtle-bg)] text-[var(--paper-cream)] group-hover:border-[var(--paper-cream)]'
              }`}
            >
              <Compass className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <span
              className={`text-[10px] sm:text-[11px] font-bold uppercase max-w-[64px] truncate text-center ${
                selectedChannel === 'all' ? 'text-[#d97706]' : 'text-[var(--paper-muted)] group-hover:text-[var(--paper-cream)]'
              }`}
            >
              All Wires
            </span>
          </button>

          {/* Individual Channel Story Avatars */}
          {channels.map((ch) => {
            const isSelected = selectedChannel === ch.id;
            return (
              <button
                key={ch.id}
                onClick={() => setSelectedChannel(ch.id)}
                className={`flex flex-col items-center gap-1.5 shrink-0 transition-transform active:scale-95 group focus:outline-none`}
              >
                <div
                  className={`relative p-0.5 rounded-full border-2 transition-all ${
                    isSelected
                      ? 'border-[#d97706] shadow-[0_0_12px_rgba(217,119,6,0.6)]'
                      : 'border-[var(--ink-border)] group-hover:border-[var(--paper-muted)]'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={ch.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${ch.id}`}
                    alt={ch.name}
                    className="w-11 h-11 sm:w-13 sm:h-13 rounded-full object-cover bg-[var(--ink-bg)]"
                  />
                  {ch.isVerified && (
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-[#d97706] text-black text-[9px] font-bold flex items-center justify-center border border-[var(--ink-bg)]">
                      ✓
                    </span>
                  )}
                </div>
                <span
                  className={`text-[10px] sm:text-[11px] font-bold uppercase max-w-[68px] sm:max-w-[76px] truncate text-center ${
                    isSelected ? 'text-[#d97706]' : 'text-[var(--paper-muted)] group-hover:text-[var(--paper-cream)]'
                  }`}
                >
                  {ch.name.split(' ')[0]}
                </span>
              </button>
            );
          })}

          {/* Plus Add Channel Shortcut */}
          <Link
            href="/channels"
            className="flex flex-col items-center gap-1.5 shrink-0 transition-transform active:scale-95 group focus:outline-none"
          >
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-dashed border-[var(--ink-border)] bg-[var(--card-bg)] text-[var(--paper-muted)] group-hover:border-[#d97706] group-hover:text-[#d97706] flex items-center justify-center transition-all">
              <Plus className="w-5 h-5" />
            </div>
            <span className="text-[10px] sm:text-[11px] font-bold uppercase text-[var(--paper-muted)] group-hover:text-[#d97706] text-center">
              More
            </span>
          </Link>
        </div>
      </div>

      {/* Main 2-Column Section: Feed on Left + Right Rail Sidebar on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
        {/* Left / Main Post Stream */}
        <div className="lg:col-span-8 flex flex-col gap-4 sm:gap-6">
          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            {/* Filter Selection Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
              <button
                onClick={() => setSelectedChannel('all')}
                className={`px-3 py-1.5 text-xs font-bold uppercase border transition-all shrink-0 active:scale-95 ${
                  selectedChannel === 'all'
                    ? 'bg-[var(--paper-cream)] text-[var(--ink-bg)] border-[var(--paper-cream)] shadow-[2px_2px_0px_0px_var(--shadow-color)]'
                    : 'bg-[var(--card-bg)] text-[var(--paper-muted)] border-[var(--ink-border)] hover:border-[var(--paper-cream)] hover:text-[var(--paper-cream)]'
                }`}
              >
                [ ALL CHANNELS ]
              </button>
              {channels.slice(0, 6).map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => setSelectedChannel(ch.id)}
                  className={`px-3 py-1.5 text-xs font-bold uppercase border transition-all shrink-0 active:scale-95 ${
                    selectedChannel === ch.id
                      ? 'bg-[var(--paper-cream)] text-[var(--ink-bg)] border-[var(--paper-cream)] shadow-[2px_2px_0px_0px_var(--shadow-color)]'
                      : 'bg-[var(--card-bg)] text-[var(--paper-muted)] border-[var(--ink-border)] hover:border-[var(--paper-cream)] hover:text-[var(--paper-cream)]'
                  }`}
                >
                  @{ch.id}
                </button>
              ))}
              {channels.length > 6 && (
                <Link
                  href="/channels"
                  className="px-2 text-xs font-bold text-[#d97706] hover:underline shrink-0"
                >
                  +{channels.length - 6} MORE
                </Link>
              )}
            </div>

            {/* Inline Quick Search Input */}
            <div className="relative shrink-0 sm:w-56">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="FILTER FEED..."
                className="w-full py-1.5 pl-8 pr-3 bg-[var(--input-bg)] border border-[var(--ink-border)] text-xs text-[var(--paper-cream)] placeholder-[var(--paper-faint)] font-teletype uppercase focus:outline-none focus:border-[#d97706]"
              />
              <Search className="w-3.5 h-3.5 text-[var(--paper-muted)] absolute left-2.5 top-2.5" />
            </div>
          </div>

          {/* Posts Feed Stream */}
          <div className="flex flex-col gap-3.5 sm:gap-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-2 text-[var(--paper-muted)] font-teletype">
                <Loader2 className="w-6 h-6 animate-spin text-[#d97706]" />
                <span className="text-xs tracking-wider uppercase">[ DECODING TELETYPE WIRES... ]</span>
              </div>
            ) : posts.length === 0 ? (
              <div className="broadsheet-card p-8 sm:p-12 text-center flex flex-col items-center justify-center gap-2 font-teletype">
                <h3 className="font-bold text-sm text-[var(--paper-cream)] uppercase">[ NO DISPATCHES FOUND ]</h3>
                <p className="text-xs text-[var(--paper-muted)] max-w-sm font-sans">
                  {searchQuery
                    ? `No records matched "${searchQuery.toUpperCase()}".`
                    : 'No transmissions logged for this channel.'}
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
                          <span>RETRIEVING NEXT PARCHMENT...</span>
                        </>
                      ) : (
                        <span>LOAD MORE DISPATCHES ↓</span>
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right Rail (Sticky Desktop Broadsheet Sidebar) */}
        <aside className="lg:col-span-4 hidden lg:flex flex-col gap-6 sticky top-20 font-teletype">
          {/* Lurkometer Widget */}
          <BabiometerWidget channel={selectedChannel === 'all' ? (channels[0]?.id || 'dagmawi_babi') : selectedChannel} />

          {/* Monitored Channels Card */}
          <div className="broadsheet-card p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[var(--ink-border)] pb-2.5">
              <div className="flex items-center gap-2">
                <Radio className="w-3.5 h-3.5 text-[#d97706]" />
                <h3 className="text-xs font-bold uppercase text-[var(--paper-cream)] tracking-wider">
                  Monitored Channels
                </h3>
              </div>
              <Link href="/channels" className="text-[10px] text-[#d97706] hover:underline uppercase font-bold">
                View All
              </Link>
            </div>

            <div className="flex flex-col gap-3">
              {channels.slice(0, 5).map((ch) => (
                <div key={ch.id} className="flex items-center justify-between gap-3">
                  <Link href={`/channel/${ch.id}`} className="flex items-center gap-2.5 min-w-0 group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={ch.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${ch.id}`}
                      alt={ch.name}
                      className="w-8 h-8 border border-[var(--ink-border)] bg-[var(--ink-bg)] object-cover shrink-0 rounded-sm"
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-[var(--paper-cream)] group-hover:text-[#d97706] transition-colors truncate uppercase">
                        {ch.name}
                      </span>
                      <span className="text-[10px] text-[var(--paper-muted)]">@{ch.id}</span>
                    </div>
                  </Link>

                  <button
                    onClick={() => handleFollowChannel(ch.id, !!ch.isSubscribed)}
                    className={`stamp-btn !p-1.5 !text-[10px] shrink-0 active:scale-95 ${
                      ch.isSubscribed ? '!bg-[#d97706] !text-black !border-[#d97706]' : ''
                    }`}
                    title={ch.isSubscribed ? 'Following' : 'Follow'}
                  >
                    {ch.isSubscribed ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Groq AI Editorial Intelligence Card */}
          <div className="broadsheet-card p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[#d97706] uppercase tracking-wider border-b border-[var(--ink-border)] pb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Groq AI Editorial Intelligence</span>
            </div>
            <p className="text-xs text-[var(--paper-muted)] font-sans leading-relaxed">
              Multi-model Groq Llama-3.3 engine generates on-demand executive summaries, satire roasts, context checks, and ELI5 breakdowns for every post in real time.
            </p>
          </div>

          {/* Telegram Bot Card */}
          <div className="broadsheet-card p-5 flex flex-col gap-3 border-2 border-[#785a28] bg-gradient-to-br from-[#241c10]/20 to-[var(--card-bg)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-[#d97706]" />
                <span className="text-xs font-bold uppercase text-[var(--paper-cream)]">Telegram Bot</span>
              </div>
              <span className="stamp-badge stamp-badge-gold text-[9px]">ACTIVE</span>
            </div>
            <p className="text-xs text-[var(--paper-muted)] font-sans leading-relaxed" suppressHydrationWarning>
              Command digests, channel searches, and live summaries directly in Telegram.
            </p>
            <a
              href={`https://t.me/${botUsername}`}
              target="_blank"
              rel="noopener noreferrer"
              suppressHydrationWarning
              className="stamp-btn !bg-[#d97706] !text-black !border-[#d97706] hover:!bg-[var(--paper-cream)] justify-between !py-2 text-xs active:scale-95"
            >
              <span suppressHydrationWarning>Summon @{botUsername}</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </aside>
      </div>

      {/* Footer Notice */}
      <div className="text-center font-teletype text-[10px] text-[var(--paper-muted)] border-t border-[var(--ink-border)] pt-6 uppercase flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>THE LURKENING · UNIVERSAL TELEGRAM CHRONICLE</span>
        <span>AUTONOMOUS INGESTION ENGINE ACTIVE</span>
      </div>

      {/* Hero Search Modal */}
      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
      />
    </div>
  );
}
