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
            description: 'Telegram channel dispatch',
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
      <div className="flex justify-center items-center py-20 text-amber-400">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      {/* Back Button */}
      <Link
        href="/channels"
        className="inline-flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-zinc-100 transition-colors self-start"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Channel Directory</span>
      </Link>

      {/* Channel Hero Card */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative overflow-hidden shadow-2xl">
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={
              channelInfo?.avatarUrl ||
              `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`
            }
            alt={channelInfo?.name || username}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-zinc-800 border-2 border-amber-500/40 object-cover"
          />
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-3xl font-black text-zinc-100">
                {channelInfo?.name || `@${username}`}
              </h1>
              {channelInfo?.isVerified && (
                <span className="text-amber-400 text-sm font-extrabold" title="Verified Channel">
                  ✓
                </span>
              )}
            </div>
            <span className="text-xs text-zinc-400 font-bold">@{username}</span>
            <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1 font-semibold">
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-amber-400" />
                {formatNumber(subCount)} subscribers
              </span>
              <span>·</span>
              <span>{posts.length} archived posts</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={handleToggleSubscribe}
            className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-xs font-black transition-all ${
              isSubscribed
                ? 'bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-rose-950/40 hover:text-rose-300'
                : 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-zinc-950 shadow-lg shadow-amber-500/25 active:scale-95'
            }`}
          >
            {isSubscribed ? (
              <>
                <Check className="w-4 h-4" />
                <span>Following</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Follow Channel</span>
              </>
            )}
          </button>

          <a
            href={`https://t.me/${username}`}
            target="_blank"
            rel="noopener noreferrer"
            title="Open in Telegram"
            className="p-3 rounded-full bg-zinc-900 border border-zinc-800 hover:border-amber-500/40 text-zinc-300 hover:text-white transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Babiometer Widget */}
      <BabiometerWidget channel={username} />

      {/* Posts Section */}
      <div className="flex flex-col gap-4">
        <h2 className="text-base font-extrabold text-zinc-100">
          Dispatches from @{username}
        </h2>

        {posts.length === 0 ? (
          <div className="glass-card rounded-3xl p-12 text-center text-zinc-400 text-xs font-medium">
            No posts recorded for this channel yet.
          </div>
        ) : (
          posts.map((post) => <PostCard key={`${post.channel}-${post.id}`} post={post} />)
        )}
      </div>
    </div>
  );
}
