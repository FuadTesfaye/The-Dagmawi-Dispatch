'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { TrackedChannel } from '@/lib/types';
import { useAuth, useToast } from './providers';
import { formatNumber } from '@/lib/utils';
import { Check, Plus, Users, Radio, Sparkles } from 'lucide-react';

interface ChannelCardProps {
  channel: TrackedChannel & { postCount?: number };
}

export function ChannelCard({ channel }: ChannelCardProps) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [isSubscribed, setIsSubscribed] = useState(channel.isSubscribed || false);
  const [subCount, setSubCount] = useState(channel.subscriberCount || 0);
  const [loading, setLoading] = useState(false);

  const handleToggleSubscribe = async () => {
    if (!user) {
      showToast('Please sign in to subscribe to channels', 'info');
      return;
    }

    setLoading(true);
    // Optimistic toggle
    setIsSubscribed((prev) => !prev);
    setSubCount((prev) => (isSubscribed ? Math.max(0, prev - 1) : prev + 1));

    try {
      const res = await fetch(`/api/channels/${channel.id}/subscribe`, {
        method: 'POST',
      });

      if (res.ok) {
        const data = await res.json();
        setIsSubscribed(data.isSubscribed);
        setSubCount(data.subscriberCount);
        showToast(
          data.isSubscribed
            ? `Subscribed to @${channel.id}! Dispatches will appear in your feed.`
            : `Unsubscribed from @${channel.id}`,
          'success'
        );
      }
    } catch {
      showToast('Failed to update subscription', 'error');
      // Revert
      setIsSubscribed(channel.isSubscribed || false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card glass-card-hover rounded-3xl p-5 sm:p-6 flex flex-col justify-between gap-4 group relative overflow-hidden">
      {/* Top Banner Accent Line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500/40 via-amber-400 to-amber-600/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="flex items-start justify-between gap-3">
        <Link href={`/channel/${channel.id}`} className="flex items-center gap-3 group/link">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={
              channel.avatarUrl ||
              `https://api.dicebear.com/7.x/bottts/svg?seed=${channel.id}`
            }
            alt={channel.name}
            className="w-12 h-12 rounded-2xl bg-zinc-800 border border-zinc-700/60 object-cover group-hover/link:scale-105 transition-transform"
          />
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <h3 className="font-black text-sm text-zinc-100 group-hover/link:text-amber-400 transition-colors">
                {channel.name}
              </h3>
              {channel.isVerified && (
                <span className="text-amber-400 text-xs font-bold" title="Verified Channel">
                  ✓
                </span>
              )}
            </div>
            <span className="text-xs font-semibold text-zinc-400">@{channel.id}</span>
          </div>
        </Link>

        {/* Subscribe Button */}
        <button
          onClick={handleToggleSubscribe}
          disabled={loading}
          className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-extrabold transition-all duration-200 ${
            isSubscribed
              ? 'bg-zinc-800 text-zinc-300 hover:bg-rose-950/40 hover:text-rose-300 hover:border-rose-500/30 border border-zinc-700'
              : 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-zinc-950 shadow-md shadow-amber-500/20 active:scale-95'
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
      </div>

      {/* Bio / Description */}
      <p className="text-xs text-zinc-300 leading-relaxed font-sans line-clamp-2">
        {channel.description || 'Dispatches and tech updates from Telegram.'}
      </p>

      {/* Channel Stats Footer */}
      <div className="flex items-center justify-between text-[11px] text-zinc-400 font-semibold pt-3 border-t border-zinc-800/80">
        <div className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-amber-400" />
          <span>{formatNumber(subCount)} subscribers</span>
        </div>

        {channel.postCount !== undefined && (
          <span className="text-zinc-500">{formatNumber(channel.postCount)} dispatches</span>
        )}
      </div>
    </div>
  );
}
