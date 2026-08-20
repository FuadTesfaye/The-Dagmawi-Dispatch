'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Post, TrackedChannel } from '@/lib/types';
import { PostCard } from '@/components/post-card';
import { BabiometerWidget } from '@/components/babiometer-widget';
import { useRealtime, useToast, useAuth } from '@/components/providers';
import { Search, Radio, Loader2, ArrowUpRight, Sparkles, Bot, Users, Check, Plus, Shield } from 'lucide-react';
import Link from 'next/link';
import { formatNumber } from '@/lib/utils';

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
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 flex flex-col gap-8">
      {/* Expansive Hero Section */}
      <div className="relative p-6 sm:p-10 rounded-2xl bg-gradient-to-b from-[#141722] to-[#0f1118] border border-[#1f2330] flex flex-col gap-5 overflow-hidden shadow-sm">
        <div className="flex items-center justify-between font-teletype text-[10px] uppercase text-[#a39e93] border-b border-[#1f2330] pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#d97706] animate-pulse" />
            <span>UNIVERSAL TELEGRAM GAZETTE & INGESTION ARCHIVE</span>
          </div>
          <span>EST. MMXXVI</span>
        </div>

        <div className="flex flex-col gap-2 max-w-3xl">
          <h1 className="font-broadsheet font-black text-3xl sm:text-5xl text-[#f4f0e6] tracking-tight uppercase">
            The Lurkening
          </h1>
          <p className="text-sm sm:text-base text-[#d6d0c2] leading-relaxed">
            Lurk on high-frequency Telegram channels without drowning in notification fatigue. Real-time multi-channel broadcast archive powered by Groq Llama-3.3 AI synthesis.
          </p>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-4 border-t border-[#1f2330]">
          {/* Substack Channel Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 no-scrollbar font-teletype">
            <button
              onClick={() => setSelectedChannel('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase transition-all shrink-0 ${
                selectedChannel === 'all'
                  ? 'bg-[#f4f0e6] text-[#0c0d10] shadow-sm'
                  : 'bg-[#161822] text-[#a39e93] border border-[#1f2330] hover:text-[#f4f0e6] hover:border-[#2e3547]'
              }`}
            >
              All Dispatches
            </button>
            {channels.slice(0, 8).map((ch) => (
              <button
                key={ch.id}
                onClick={() => setSelectedChannel(ch.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 ${
                  selectedChannel === ch.id
                    ? 'bg-[#f4f0e6] text-[#0c0d10] shadow-sm'
                    : 'bg-[#161822] text-[#a39e93] border border-[#1f2330] hover:text-[#f4f0e6] hover:border-[#2e3547]'
                }`}
              >
                @{ch.id}
              </button>
            ))}
            {channels.length > 8 && (
              <Link
                href="/channels"
                className="px-3 py-1.5 rounded-full text-xs font-semibold text-[#d97706] hover:underline shrink-0"
              >
                +{channels.length - 8} more...
              </Link>
            )}
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-72 shrink-0 font-teletype">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dispatches..."
              className="w-full py-1.5 pl-8 pr-3 bg-[#11131a] border border-[#1f2330] rounded-full text-xs text-[#f4f0e6] placeholder-[#6b665c] focus:outline-none focus:border-[#d97706] transition-colors"
            />
            <Search className="w-3.5 h-3.5 text-[#a39e93] absolute left-3 top-2.5" />
          </div>
        </div>
      </div>

      {/* Main Grid Layout: Primary Feed + Right Rail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main Feed Column */}
        <div className="lg:col-span-8 flex flex-col gap-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-[#a39e93] font-teletype">
              <Loader2 className="w-7 h-7 animate-spin text-[#d97706]" />
              <span className="text-xs uppercase tracking-wider">[ Decoding Telegram Transmissions... ]</span>
            </div>
          ) : posts.length === 0 ? (
            <div className="substack-card p-12 text-center rounded-2xl flex flex-col items-center justify-center gap-2 font-teletype">
              <h3 className="font-bold text-base text-[#f4f0e6] uppercase">[ No Dispatches Found ]</h3>
              <p className="text-xs text-[#a39e93] max-w-sm">
                {searchQuery
                  ? `No records matched "${searchQuery}".`
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
                <div className="flex justify-center pt-4">
                  <button
                    onClick={() => fetchPosts(page + 1)}
                    disabled={loadingMore}
                    className="substack-btn-secondary !py-2.5 !px-8 text-xs font-teletype font-semibold"
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-[#d97706]" />
                        <span>Retrieving older dispatches...</span>
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

        {/* Right Rail (Sticky Desktop Substack Rail) */}
        <aside className="lg:col-span-4 hidden lg:flex flex-col gap-6 sticky top-24">
          {/* Lurkometer Chrono Widget */}
          <BabiometerWidget channel={selectedChannel === 'all' ? (channels[0]?.id || 'dagmawi_babi') : selectedChannel} />

          {/* Featured Channels / Publications */}
          <div className="substack-card p-5 rounded-2xl flex flex-col gap-4 font-teletype">
            <div className="flex items-center justify-between border-b border-[#1f2330] pb-2.5">
              <div className="flex items-center gap-2">
                <Radio className="w-3.5 h-3.5 text-[#d97706]" />
                <h3 className="text-xs font-bold uppercase text-[#f4f0e6] tracking-wider">
                  Monitored Channels
                </h3>
              </div>
              <Link href="/channels" className="text-[11px] text-[#d97706] hover:underline">
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
                      className="w-8 h-8 rounded-full border border-[#2e3547] bg-[#161822] object-cover shrink-0"
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-[#f4f0e6] group-hover:text-[#d97706] transition-colors truncate">
                        {ch.name}
                      </span>
                      <span className="text-[10px] text-[#a39e93]">@{ch.id}</span>
                    </div>
                  </Link>

                  <button
                    onClick={() => handleFollowChannel(ch.id, !!ch.isSubscribed)}
                    className={`p-1.5 rounded-full border text-xs transition-all shrink-0 ${
                      ch.isSubscribed
                        ? 'bg-[#d97706] text-black border-[#d97706]'
                        : 'border-[#1f2330] text-[#a39e93] hover:text-[#f4f0e6] hover:border-[#2e3547]'
                    }`}
                    title={ch.isSubscribed ? 'Following' : 'Follow'}
                  >
                    {ch.isSubscribed ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* AI Synthesis Briefing Card */}
          <div className="substack-card p-5 rounded-2xl flex flex-col gap-3 font-teletype">
            <div className="flex items-center gap-2 text-xs font-bold text-[#d97706] uppercase tracking-wider border-b border-[#1f2330] pb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Groq AI Editorial Intelligence</span>
            </div>
            <p className="text-xs text-[#a39e93] font-sans leading-relaxed">
              Multi-model Groq Llama-3.3 engine generates on-demand executive summaries, satyrical roasts, context checks, and ELI5 breakdowns for every post in real time.
            </p>
          </div>

          {/* Bot Callout */}
          <div className="substack-card p-5 rounded-2xl flex flex-col gap-3 font-teletype border border-[#785a28]/40 bg-gradient-to-br from-[#181510] to-[#12141c]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-[#d97706]" />
                <span className="text-xs font-bold uppercase text-[#f6d89b]">Telegram Bot</span>
              </div>
              <span className="stamp-badge stamp-badge-gold text-[9px]">ACTIVE</span>
            </div>
            <p className="text-xs text-[#a39e93] font-sans leading-relaxed">
              Command digests, channel searches, and live summaries directly in Telegram.
            </p>
            <a
              href="https://t.me/lurklord_bot"
              target="_blank"
              rel="noopener noreferrer"
              className="substack-btn-primary justify-between !py-2 text-xs"
            >
              <span>Summon @lurklord_bot</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </aside>
      </div>
    </div>
  );
}
