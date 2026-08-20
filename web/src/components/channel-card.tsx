'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { TrackedChannel } from '@/lib/types';
import { useAuth, useToast } from './providers';
import { formatNumber } from '@/lib/utils';
import { Check, Plus, Users, ArrowUpRight } from 'lucide-react';

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
      showToast('Authentication required to follow channel', 'info');
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
    <div className="substack-card p-5 sm:p-6 rounded-2xl flex flex-col justify-between gap-4 transition-all group">
      <div className="flex items-start justify-between gap-3">
        <Link href={`/channel/${channel.id}`} className="flex items-center gap-3 min-w-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={
              channel.avatarUrl ||
              `https://api.dicebear.com/7.x/bottts/svg?seed=${channel.id}`
            }
            alt={channel.name}
            className="w-12 h-12 rounded-full border border-[#2e3547] bg-[#161822] object-cover shrink-0"
          />
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-sm text-[#f4f0e6] group-hover:text-[#d97706] transition-colors truncate">
                {channel.name}
              </h3>
              {channel.isVerified && (
                <span className="w-3.5 h-3.5 rounded-full bg-[#d97706]/20 text-[#d97706] text-[9px] font-bold inline-flex items-center justify-center">
                  ✓
                </span>
              )}
            </div>
            <span className="font-teletype text-xs text-[#a39e93]">@{channel.id}</span>
          </div>
        </Link>

        {/* Subscribe / Follow Button */}
        <button
          onClick={handleToggleSubscribe}
          disabled={loading}
          className={`px-3.5 py-1.5 rounded-full text-xs font-teletype font-semibold transition-all flex items-center gap-1 shrink-0 ${
            isSubscribed
              ? 'bg-[#d97706] text-black shadow-sm'
              : 'border border-[#1f2330] bg-[#151822] text-[#f4f0e6] hover:border-[#2e3547]'
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
      <p className="text-xs sm:text-sm text-[#d6d0c2] leading-relaxed line-clamp-2 font-sans">
        {channel.description || 'Public Telegram broadcast feed indexed for autonomous intelligence.'}
      </p>

      {/* Footer Metrics */}
      <div className="flex items-center justify-between font-teletype text-[11px] text-[#a39e93] pt-3 border-t border-[#1f2330]">
        <div className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-[#d97706]" />
          <span>{formatNumber(subCount)} Subscribers</span>
        </div>

        {channel.postCount !== undefined && (
          <span>{formatNumber(channel.postCount)} Dispatches</span>
        )}
      </div>
    </div>
  );
}
