'use client';

import React, { useState, useEffect, use } from 'react';
import { TrackedChannel, Post } from '@/lib/types';
import { PostCard } from '@/components/post-card';
import { BabiometerWidget } from '@/components/babiometer-widget';
import { useAuth, useToast } from '@/components/providers';
import { formatNumber } from '@/lib/utils';
import { Check, Plus, ArrowLeft, Loader2, ArrowUpRight, Bell, BellOff } from 'lucide-react';
import Link from 'next/link';

import { fetchWithCache, getCached } from '@/lib/cache';
import { useChannelMute } from '@/lib/mute-store';

export default function ChannelProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const resolvedParams = use(params);
  const username = resolvedParams.username.replace(/^@/, '');

  const { user } = useAuth();
  const { showToast } = useToast();

  const channelsCache = getCached<{ channels: TrackedChannel[] }>('/api/channels');
  const cachedChannel = channelsCache.data?.channels?.find(
    (c) => c.id.toLowerCase() === username.toLowerCase()
  );
  const postsCache = getCached<{ posts: Post[] }>(`/api/posts?channel=${username}&limit=30`);

  const [channelInfo, setChannelInfo] = useState<TrackedChannel | null>(cachedChannel || null);
  const [posts, setPosts] = useState<Post[]>(postsCache.data?.posts || []);
  const [isSubscribed, setIsSubscribed] = useState(cachedChannel?.isSubscribed || false);
  const [subCount, setSubCount] = useState(cachedChannel?.subscriberCount || 0);
  const [loading, setLoading] = useState(!cachedChannel && !postsCache.data);

  useEffect(() => {
    Promise.all([
      fetchWithCache<{ channels: TrackedChannel[] }>(`/api/channels?q=${username}`),
      fetchWithCache<{ posts: Post[] }>(`/api/posts?channel=${username}&limit=30`),
    ])
      .then(([chanData, postData]) => {
        const found = chanData.channels?.find(
          (c: any) => c.id.toLowerCase() === username.toLowerCase()
        );
        if (found) {
          setChannelInfo(found);
          setIsSubscribed(found.isSubscribed || false);
          setSubCount(found.subscriberCount || 0);
        } else if (!channelInfo) {
          setChannelInfo({
            id: username,
            name: `@${username}`,
            description: 'Public Telegram channel broadcast feed indexed for autonomous intelligence.',
            avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`,
            subscriberCount: 0,
            isVerified: false,
            createdAt: new Date().toISOString(),
          });
        }

        if (postData?.posts) {
          setPosts(postData.posts);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [username]);

  const handleToggleSubscribe = async () => {
    if (!user) {
      showToast('Authentication required to follow channel', 'info');
      return;
    }

    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(30);
    }

    const nextSub = !isSubscribed;
    setIsSubscribed(nextSub);
    setSubCount((prev) => (nextSub ? prev + 1 : Math.max(0, prev - 1)));

    try {
      const res = await fetch(`/api/channels/${username}/subscribe`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setIsSubscribed(data.isSubscribed);
        setSubCount(data.subscriberCount);
        showToast(
          data.isSubscribed ? `Now following @${username}` : `Unfollowed @${username}`,
          'success'
        );
      }
    } catch {
      showToast('Subscription error', 'error');
      setIsSubscribed(!nextSub);
    }
  };

  const { isMuted, toggle: toggleMute } = useChannelMute(username, channelInfo?.isMuted);

  const handleToggleMute = async () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(20);
    }
    const next = await toggleMute();
    showToast(next ? `Muted @${username} transmissions` : `Unmuted @${username}`, next ? 'info' : 'success');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-28 text-[#a39e93] font-teletype">
        <Loader2 className="w-7 h-7 animate-spin text-[#d97706]" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-8 flex flex-col gap-6 sm:gap-8 font-teletype">
      {/* Back Button */}
      <Link
        href="/channels"
        className="inline-flex items-center gap-1.5 text-xs text-[var(--paper-muted)] hover:text-[var(--paper-cream)] transition-colors self-start uppercase font-bold active:scale-95"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Return to Publication Directory</span>
      </Link>

      {/* Channel Profile Hero Banner */}
      <div className={`p-4 sm:p-7 bg-[var(--card-bg)] border-2 border-[var(--ink-border-heavy)] shadow-[4px_4px_0px_0px_var(--shadow-color)] sm:shadow-[6px_6px_0px_0px_var(--shadow-color)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6 ${isMuted ? 'border-dashed' : ''}`}>
        <div className="flex items-center gap-3.5 sm:gap-5 min-w-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <div className="relative shrink-0">
            <img
              src={
                channelInfo?.avatarUrl ||
                `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`
              }
              alt={channelInfo?.name || username}
              className="w-16 h-16 sm:w-20 sm:h-20 border-2 border-[var(--ink-border)] bg-[var(--ink-bg)] object-cover rounded-sm"
            />
            {isMuted && (
              <div className="absolute -bottom-1 -right-1 bg-red-600 text-white p-1 rounded-full border border-[var(--ink-bg)]">
                <BellOff className="w-3 h-3" />
              </div>
            )}
          </div>
          <div className="flex flex-col min-w-0 gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-broadsheet font-black text-2xl sm:text-3xl text-[var(--paper-cream)] tracking-tight uppercase truncate">
                {channelInfo?.name || `@${username}`}
              </h1>
              {channelInfo?.isVerified && (
                <span className="stamp-badge-gold stamp-badge text-[10px]">
                  VERIFIED
                </span>
              )}
              {isMuted && (
                <span className="text-[10px] text-red-400 border border-red-500/40 px-1.5 py-0.5 uppercase font-bold">
                  MUTED WIRE
                </span>
              )}
            </div>
            <span className="text-xs text-[var(--paper-muted)]">@{username}</span>
            <div className="flex items-center gap-2.5 text-xs text-[var(--paper-muted)] mt-0.5">
              <span>{formatNumber(subCount)} FOLLOWERS</span>
              <span>·</span>
              <span>{posts.length} DISPATCHES</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--ink-border)]">
          {/* Mute/Unmute Action */}
          <button
            onClick={handleToggleMute}
            className={`stamp-btn !py-2 !px-3 text-xs flex items-center gap-1.5 active:scale-95 transition-colors ${
              isMuted
                ? '!bg-red-950/60 !text-red-300 !border-red-600/50 hover:!bg-red-900/60'
                : '!bg-[var(--card-bg)] !text-[var(--paper-muted)] hover:!text-[var(--paper-cream)]'
            }`}
            title={isMuted ? 'Unmute Channel' : 'Mute Channel'}
          >
            {isMuted ? (
              <>
                <BellOff className="w-3.5 h-3.5 text-red-400" />
                <span>MUTED</span>
              </>
            ) : (
              <>
                <Bell className="w-3.5 h-3.5" />
                <span>MUTE</span>
              </>
            )}
          </button>

          <button
            onClick={handleToggleSubscribe}
            className={`stamp-btn flex-1 sm:flex-initial !py-2 !px-4 text-xs font-bold active:scale-95 ${
              isSubscribed ? '!bg-[#d97706] !text-black !border-[#d97706]' : ''
            }`}
          >
            {isSubscribed ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>FOLLOWING</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>FOLLOW CHANNEL</span>
              </>
            )}
          </button>

          <a
            href={`https://t.me/${username}`}
            target="_blank"
            rel="noopener noreferrer"
            title="Open in Telegram"
            className="stamp-btn !py-2 !px-3 text-xs flex items-center gap-1 active:scale-95"
          >
            <span>WIRE</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-[#d97706]" />
          </a>
        </div>
      </div>

      {/* Description */}
      {channelInfo?.description && (
        <p className="text-xs sm:text-sm text-[var(--paper-muted)] leading-relaxed font-sans -mt-2 sm:-mt-4">
          {channelInfo.description}
        </p>
      )}

      {/* Activity Gauge */}
      <BabiometerWidget channel={username} />

      {/* Posts Feed Section */}
      <div className="flex flex-col gap-3.5 sm:gap-4">
        <div className="flex items-center justify-between border-b border-[var(--ink-border)] pb-2 text-xs uppercase tracking-wider text-[var(--paper-muted)]">
          <span>Dispatch Ledger Archive</span>
          <span>{posts.length} Transmissions</span>
        </div>

        {posts.length === 0 ? (
          <div className="broadsheet-card p-10 text-center text-[var(--paper-muted)] text-xs">
            [ NO TRANSMISSIONS RECORDED FOR THIS CHANNEL ]
          </div>
        ) : (
          posts.map((post) => <PostCard key={`${post.channel}-${post.id}`} post={post} />)
        )}
      </div>
    </div>
  );
}
