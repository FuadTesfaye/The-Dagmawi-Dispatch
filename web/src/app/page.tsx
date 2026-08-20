'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Post, TrackedChannel } from '@/lib/types';
import { PostCard } from '@/components/post-card';
import { BabiometerWidget } from '@/components/babiometer-widget';
import { useRealtime, useToast, useAuth } from '@/components/providers';
import { Search, Radio, Loader2, ArrowUpRight, Bot, Shield, Database, Sparkles, Check, Plus, Users } from 'lucide-react';
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
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex flex-col gap-10 font-teletype">
      {/* Frontpage Broadsheet Masthead */}
      <div className="p-6 sm:p-12 bg-[#12141c] border-2 border-[#262936] shadow-[6px_6px_0px_0px_#000000] flex flex-col gap-6 text-center items-center">
        {/* Scribe Stamp */}
        <div className="inline-flex items-center gap-2 stamp-badge-gold stamp-badge text-xs">
          <span>§ UNIVERSAL TELEGRAM COMMUNITY LURKER</span>
          <span>·</span>
          <span>ISSUE NO. 88</span>
        </div>

        {/* Masthead Title */}
        <div className="flex flex-col gap-2">
          <h1 className="font-broadsheet font-black text-4xl sm:text-7xl text-[#f4f0e6] tracking-tight uppercase">
            The Lurkening
          </h1>
          <p className="font-teletype text-xs sm:text-sm text-[#d6d0c2] max-w-2xl mx-auto leading-relaxed uppercase">
            Universal Telegram channel monitoring, Groq AI editorial intelligence, and multi-channel discovery.
          </p>
        </div>

        <p className="italic font-sans text-xs sm:text-sm text-[#a39e93] max-w-lg">
          &ldquo;Lurk on any Telegram channel without drowning in the endless flood of posts.&rdquo;
        </p>

        {/* Action Stamps */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-[#262936] w-full">
          <a
            href="https://t.me/lurklord_bot"
            target="_blank"
            rel="noopener noreferrer"
            className="stamp-btn flex items-center gap-2 !py-2.5 !px-5 text-xs"
          >
            <Bot className="w-4 h-4 text-[#d97706]" />
            <span>SUMMON @lurklord_bot</span>
          </a>

          <Link
            href="/channels"
            className="stamp-btn !bg-[#12141c] !text-[#a39e93] hover:!text-[#f4f0e6] flex items-center gap-2 !py-2.5 !px-5 text-xs"
          >
            <Search className="w-4 h-4 text-[#d97706]" />
            <span>SEARCH ENGINE & GRAPH</span>
          </Link>
        </div>
      </div>

      {/* 3 Feature Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="broadsheet-card p-5 sm:p-6 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-[#262936] pb-2">
            <span className="text-xs font-bold text-[#d97706] uppercase">[ 01 LURKOMETER ]</span>
            <span className="text-[10px] text-[#a39e93]">TELETYPE</span>
          </div>
          <h3 className="font-broadsheet font-bold text-lg text-[#f4f0e6] uppercase">The Lurk-O-Meter</h3>
          <p className="font-sans text-xs text-[#a39e93] leading-relaxed">
            Real-time activity gauge measuring daily broadcast volume across any tracked channel so you know before you read.
          </p>
        </div>

        <div className="broadsheet-card p-5 sm:p-6 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-[#262936] pb-2">
            <span className="text-xs font-bold text-[#d97706] uppercase">[ 02 SYNTHESIS ]</span>
            <span className="text-[10px] text-[#a39e93]">GROQ AI</span>
          </div>
          <h3 className="font-broadsheet font-bold text-lg text-[#f4f0e6] uppercase">AI Summaries & Roasts</h3>
          <p className="font-sans text-xs text-[#a39e93] leading-relaxed">
            Multi-model Groq Llama-3.3 engine delivers executive summaries, satire roasts, context checks, and ELI5 breakdowns for any channel.
          </p>
        </div>

        <div className="broadsheet-card p-5 sm:p-6 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-[#262936] pb-2">
            <span className="text-xs font-bold text-[#d97706] uppercase">[ 03 EXPLORER ]</span>
            <span className="text-[10px] text-[#a39e93]">DATABASE</span>
          </div>
          <h3 className="font-broadsheet font-bold text-lg text-[#f4f0e6] uppercase">Full-Text Registry</h3>
          <p className="font-sans text-xs text-[#a39e93] leading-relaxed">
            Search historical archives across all monitored Telegram channels with interactive network graphs and category indexes.
          </p>
        </div>
      </div>

      {/* Main 2-Column Section: Feed on Left + Right Rail Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left / Main Post Stream */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Filter & Search Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
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
              {channels.slice(0, 8).map((ch) => (
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
              {channels.length > 8 && (
                <Link
                  href="/channels"
                  className="px-2 text-xs font-bold text-[#d97706] hover:underline shrink-0"
                >
                  +{channels.length - 8} MORE
                </Link>
              )}
            </div>

            {/* Search Input */}
            <div className="relative shrink-0 sm:w-60">
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

          {/* Posts Feed */}
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

        {/* Right Rail (Sticky Desktop Broadsheet Sidebar) */}
        <aside className="lg:col-span-4 hidden lg:flex flex-col gap-6 sticky top-24 font-teletype">
          {/* Lurkometer Widget */}
          <BabiometerWidget channel={selectedChannel === 'all' ? (channels[0]?.id || 'dagmawi_babi') : selectedChannel} />

          {/* Monitored Channels Card */}
          <div className="broadsheet-card p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[#262936] pb-2.5">
              <div className="flex items-center gap-2">
                <Radio className="w-3.5 h-3.5 text-[#d97706]" />
                <h3 className="text-xs font-bold uppercase text-[#f4f0e6] tracking-wider">
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
                      className="w-8 h-8 border border-[#262936] bg-[#12141c] object-cover shrink-0"
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-[#f4f0e6] group-hover:text-[#d97706] transition-colors truncate uppercase">
                        {ch.name}
                      </span>
                      <span className="text-[10px] text-[#a39e93]">@{ch.id}</span>
                    </div>
                  </Link>

                  <button
                    onClick={() => handleFollowChannel(ch.id, !!ch.isSubscribed)}
                    className={`stamp-btn !p-1.5 !text-[10px] shrink-0 ${
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
            <div className="flex items-center gap-2 text-xs font-bold text-[#d97706] uppercase tracking-wider border-b border-[#262936] pb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Groq AI Editorial Intelligence</span>
            </div>
            <p className="text-xs text-[#a39e93] font-sans leading-relaxed">
              Multi-model Groq Llama-3.3 engine generates on-demand executive summaries, satyrical roasts, context checks, and ELI5 breakdowns for every post in real time.
            </p>
          </div>

          {/* Telegram Bot Card */}
          <div className="broadsheet-card p-5 flex flex-col gap-3 border-2 border-[#785a28] bg-gradient-to-br from-[#1c160e] to-[#12141c]">
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
              className="stamp-btn !bg-[#d97706] !text-black !border-[#d97706] hover:!bg-[#f4f0e6] justify-between !py-2 text-xs"
            >
              <span>Summon @lurklord_bot</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </aside>
      </div>

      {/* Footer Notice */}
      <div className="text-center font-teletype text-[10px] text-[#a39e93] border-t border-[#262936] pt-6 uppercase flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>THE LURKENING · UNIVERSAL TELEGRAM CHRONICLE</span>
        <span>AUTONOMOUS INGESTION ENGINE ACTIVE</span>
      </div>
    </div>
  );
}
