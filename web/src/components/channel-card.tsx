'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { TrackedChannel } from '@/lib/types';
import { useAuth, useToast } from './providers';
import { formatNumber } from '@/lib/utils';
import { Check, Plus, Users } from 'lucide-react';

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
      }
    } catch {
      showToast('Failed to update subscription', 'error');
      setIsSubscribed(channel.isSubscribed || false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="editorial-card p-4 sm:p-5 flex flex-col justify-between gap-3.5">
      <div className="flex items-start justify-between gap-3">
        <Link href={`/channel/${channel.id}`} className="flex items-center gap-3 group/link">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={
              channel.avatarUrl ||
              `https://api.dicebear.com/7.x/bottts/svg?seed=${channel.id}`
            }
            alt={channel.name}
            className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-800 object-cover"
          />
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <h3 className="font-semibold text-sm text-zinc-100 group-hover/link:text-zinc-300 transition-colors">
                {channel.name}
              </h3>
              {channel.isVerified && (
                <span className="text-zinc-400 text-xs font-bold" title="Verified">
                  ✓
                </span>
              )}
            </div>
            <span className="text-xs text-zinc-500">@{channel.id}</span>
          </div>
        </Link>

        {/* Subscribe Button */}
        <button
          onClick={handleToggleSubscribe}
          disabled={loading}
          className={`inline-flex items-center gap-1 px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
            isSubscribed
              ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              : 'bg-zinc-100 hover:bg-white text-zinc-950'
          }`}
        >
          {isSubscribed ? (
            <>
              <Check className="w-3 h-3" />
              <span>Following</span>
            </>
          ) : (
            <>
              <Plus className="w-3 h-3" />
              <span>Follow</span>
            </>
          )}
        </button>
      </div>

      {/* Description */}
      <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">
        {channel.description || 'Telegram channel publication stream.'}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-2.5 hairline-t">
        <div className="flex items-center gap-1">
          <Users className="w-3 h-3 text-zinc-500" />
          <span>{formatNumber(subCount)} subscribers</span>
        </div>

        {channel.postCount !== undefined && (
          <span>{formatNumber(channel.postCount)} dispatches</span>
        )}
      </div>
    </div>
  );
}
