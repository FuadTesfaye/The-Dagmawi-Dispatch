'use client';

import React, { useState, useEffect, use } from 'react';
import { TrackedChannel, Post } from '@/lib/types';
import { PostCard } from '@/components/post-card';
import { BabiometerWidget } from '@/components/babiometer-widget';
import { useAuth, useToast } from '@/components/providers';
import { formatNumber } from '@/lib/utils';
import { Check, Plus, ArrowLeft, Loader2, ExternalLink } from 'lucide-react';
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
      fetch(`/api/posts?channel=${username}&limit=25`).then((r) => r.json()),
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
            description: 'Telegram channel broadcast transmission',
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
      <div className="flex justify-center items-center py-20 text-[#a39e93] font-teletype">
        <Loader2 className="w-6 h-6 animate-spin text-[#d97706]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto font-teletype">
      {/* Back Button */}
      <Link
        href="/channels"
        className="inline-flex items-center gap-1.5 text-xs text-[#a39e93] hover:text-[#f4f0e6] transition-colors self-start uppercase font-bold"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>← RETURN TO CHANNEL REGISTRY</span>
      </Link>

      {/* Hero Broadsheet Card */}
      <div className="broadsheet-card p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={
              channelInfo?.avatarUrl ||
              `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`
            }
            alt={channelInfo?.name || username}
            className="w-14 h-14 border-2 border-[#3d4257] bg-[#12141c] object-cover"
          />
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="font-broadsheet font-black text-xl sm:text-2xl text-[#f4f0e6] uppercase">
                {channelInfo?.name || `@${username}`}
              </h1>
              {channelInfo?.isVerified && (
                <span className="text-[#d97706] text-xs font-bold">
                  [VERIFIED]
                </span>
              )}
            </div>
            <span className="text-xs text-[#a39e93]">@{username}</span>
            <div className="flex items-center gap-2 text-[11px] text-[#a39e93] mt-1 uppercase">
              <span>{formatNumber(subCount)} SUBSCRIBERS</span>
              <span>·</span>
              <span>{posts.length} DISPATCHES IN ARCHIVE</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleToggleSubscribe}
            className={`stamp-btn flex-1 sm:flex-initial !text-xs ${
              isSubscribed ? '!bg-[#d97706] !text-black !border-[#d97706]' : ''
            }`}
          >
            {isSubscribed ? (
              <>
                <Check className="w-3.5 h-3.5 inline mr-1" />
                <span>FOLLOWING</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5 inline mr-1" />
                <span>FOLLOW CHANNEL</span>
              </>
            )}
          </button>

          <a
            href={`https://t.me/${username}`}
            target="_blank"
            rel="noopener noreferrer"
            title="Open Telegram Wire"
            className="p-2 border border-[#262936] hover:border-[#f4f0e6] text-[#a39e93] hover:text-[#f4f0e6] transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Teletype Chronometer */}
      <BabiometerWidget channel={username} />

      {/* Posts Feed */}
      <div className="flex flex-col gap-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#a39e93] border-b border-[#262936] pb-1">
          § DISPATCH ARCHIVE: @{username}
        </h2>

        {posts.length === 0 ? (
          <div className="broadsheet-card p-10 text-center text-[#a39e93] text-xs">
            [ NO TRANSMISSIONS RECORDED FOR THIS CHANNEL ]
          </div>
        ) : (
          posts.map((post) => <PostCard key={`${post.channel}-${post.id}`} post={post} />)
        )}
      </div>
    </div>
  );
}
