'use client';

import React, { useState, useEffect, use } from 'react';
import { TrackedChannel, Post } from '@/lib/types';
import { PostCard } from '@/components/post-card';
import { BabiometerWidget } from '@/components/babiometer-widget';
import { useAuth, useToast } from '@/components/providers';
import { formatNumber } from '@/lib/utils';
import { Check, Plus, Users, ArrowLeft, Loader2, ExternalLink } from 'lucide-react';
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
            description: 'Telegram channel broadcast stream',
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
      showToast('Please sign in to follow channels', 'info');
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
      <div className="flex justify-center items-center py-20 text-zinc-500">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto">
      {/* Back Button */}
      <Link
        href="/channels"
        className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors self-start font-medium"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Channels</span>
      </Link>

      {/* Hero Card */}
      <div className="editorial-card p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={
              channelInfo?.avatarUrl ||
              `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`
            }
            alt={channelInfo?.name || username}
            className="w-14 h-14 rounded-xl bg-zinc-800 border border-zinc-800 object-cover"
          />
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <h1 className="text-lg sm:text-xl font-bold text-white">
                {channelInfo?.name || `@${username}`}
              </h1>
              {channelInfo?.isVerified && (
                <span className="text-zinc-400 text-xs font-bold" title="Verified">
                  ✓
                </span>
              )}
            </div>
            <span className="text-xs text-zinc-500 font-medium">@{username}</span>
            <div className="flex items-center gap-2 text-xs text-zinc-400 mt-1">
              <span>{formatNumber(subCount)} subscribers</span>
              <span>·</span>
              <span>{posts.length} dispatches</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleToggleSubscribe}
            className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              isSubscribed
                ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                : 'bg-zinc-100 hover:bg-white text-zinc-950'
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
                <span>Follow</span>
              </>
            )}
          </button>

          <a
            href={`https://t.me/${username}`}
            target="_blank"
            rel="noopener noreferrer"
            title="Open in Telegram"
            className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Activity Meter */}
      <BabiometerWidget channel={username} />

      {/* Posts Section */}
      <div className="flex flex-col gap-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
          Dispatches from @{username}
        </h2>

        {posts.length === 0 ? (
          <div className="editorial-card p-10 text-center text-zinc-500 text-xs">
            No dispatches recorded for this channel yet.
          </div>
        ) : (
          posts.map((post) => <PostCard key={`${post.channel}-${post.id}`} post={post} />)
        )}
      </div>
    </div>
  );
}
