'use client';

import React, { useState, useEffect, use } from 'react';
import { TrackedChannel, Post } from '@/lib/types';
import { PostCard } from '@/components/post-card';
import { BabiometerWidget } from '@/components/babiometer-widget';
import { useAuth, useToast } from '@/components/providers';
import { formatNumber } from '@/lib/utils';
import { Check, Plus, ArrowLeft, Loader2, ExternalLink, Radio, Users } from 'lucide-react';
import Link from 'next/link';

export default function ChannelProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const resolvedParams = use(params);
  const username = resolvedParams.username.replace(/^@/, '');

  const { user } = useAuth();
  const { showToast } = useToast();

  const [channelInfo, setChannelInfo] = useState<TrackedChannel | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subCount, setSubCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    Promise.all([
      fetch(`/api/channels?q=${username}`).then((r) => r.json()),
      fetch(`/api/posts?channel=${username}&limit=30`).then((r) => r.json()),
    ])
      .then(([chanData, postData]) => {
        const found = chanData.channels?.find(
          (c: any) => c.id.toLowerCase() === username.toLowerCase()
        );
        if (found) {
          setChannelInfo(found);
          setIsSubscribed(found.isSubscribed || false);
          setSubCount(found.subscriberCount || 0);
        } else {
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

        if (postData.posts) {
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

    setIsSubscribed((prev) => !prev);
    setSubCount((prev) => (isSubscribed ? Math.max(0, prev - 1) : prev + 1));

    try {
      const res = await fetch(`/api/channels/${username}/subscribe`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setIsSubscribed(data.isSubscribed);
        setSubCount(data.subscriberCount);
      }
    } catch {
      showToast('Subscription error', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-28 text-[#a39e93] font-teletype">
        <Loader2 className="w-7 h-7 animate-spin text-[#d97706]" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col gap-8">
      {/* Back Button */}
      <Link
        href="/channels"
        className="inline-flex items-center gap-2 text-xs font-teletype font-semibold text-[#a39e93] hover:text-[#f4f0e6] transition-colors self-start uppercase"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Return to Publication Directory</span>
      </Link>

      {/* Substack Publication Hero Banner */}
      <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-b from-[#141722] to-[#0f1118] border border-[#1f2330] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-sm">
        <div className="flex items-center gap-4 sm:gap-5 min-w-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={
              channelInfo?.avatarUrl ||
              `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`
            }
            alt={channelInfo?.name || username}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-[#2e3547] bg-[#161822] object-cover shrink-0 shadow-md"
          />
          <div className="flex flex-col min-w-0 gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-broadsheet font-black text-2xl sm:text-3xl text-[#f4f0e6] tracking-tight">
                {channelInfo?.name || `@${username}`}
              </h1>
              {channelInfo?.isVerified && (
                <span className="w-4 h-4 rounded-full bg-[#d97706]/20 text-[#d97706] text-[10px] font-bold inline-flex items-center justify-center">
                  ✓
                </span>
              )}
            </div>
            <span className="font-teletype text-xs text-[#a39e93]">@{username}</span>
            <div className="flex items-center gap-3 text-xs font-teletype text-[#a39e93] mt-1">
              <span>{formatNumber(subCount)} Followers</span>
              <span>•</span>
              <span>{posts.length} Dispatches</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <button
            onClick={handleToggleSubscribe}
            className={`flex-1 sm:flex-initial px-5 py-2 rounded-full font-teletype font-semibold text-xs transition-all flex items-center justify-center gap-1.5 ${
              isSubscribed
                ? 'bg-[#d97706] text-black shadow-sm'
                : 'substack-btn-primary'
            }`}
          >
            {isSubscribed ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Following</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>Follow Channel</span>
              </>
            )}
          </button>

          <a
            href={`https://t.me/${username}`}
            target="_blank"
            rel="noopener noreferrer"
            title="Open in Telegram"
            className="p-2.5 rounded-full border border-[#1f2330] hover:border-[#2e3547] bg-[#151822] text-[#a39e93] hover:text-[#f4f0e6] transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Description */}
      {channelInfo?.description && (
        <p className="text-sm sm:text-base text-[#d6d0c2] leading-relaxed -mt-2">
          {channelInfo.description}
        </p>
      )}

      {/* Activity Gauge */}
      <BabiometerWidget channel={username} />

      {/* Posts Feed Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-[#1f2330] pb-2 font-teletype text-xs uppercase tracking-wider text-[#a39e93]">
          <span>Dispatch Ledger Archive</span>
          <span>{posts.length} Transmissions</span>
        </div>

        {posts.length === 0 ? (
          <div className="substack-card p-12 rounded-2xl text-center text-[#a39e93] text-xs font-teletype">
            [ NO TRANSMISSIONS RECORDED FOR THIS CHANNEL ]
          </div>
        ) : (
          posts.map((post) => <PostCard key={`${post.channel}-${post.id}`} post={post} />)
        )}
      </div>
    </div>
  );
}
