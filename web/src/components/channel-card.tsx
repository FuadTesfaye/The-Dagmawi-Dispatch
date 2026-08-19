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
      showToast('Authentication required to subscribe to ledger', 'info');
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
      showToast('Failed to update subscription ledger', 'error');
      setIsSubscribed(channel.isSubscribed || false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="broadsheet-card p-4 sm:p-5 flex flex-col justify-between gap-3 font-teletype">
      <div className="flex items-start justify-between gap-3">
        <Link href={`/channel/${channel.id}`} className="flex items-center gap-3 group/link">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={
              channel.avatarUrl ||
              `https://api.dicebear.com/7.x/bottts/svg?seed=${channel.id}`
            }
            alt={channel.name}
            className="w-10 h-10 border-2 border-[#262936] bg-[#12141c] object-cover"
          />
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-xs text-[#f4f0e6] uppercase group-hover/link:text-[#d97706] transition-colors">
                {channel.name}
              </h3>
              {channel.isVerified && (
                <span className="text-[#d97706] text-[10px] font-bold">
                  [V]
                </span>
              )}
            </div>
            <span className="text-[10px] text-[#a39e93]">@{channel.id}</span>
          </div>
        </Link>

        {/* Subscribe Button */}
        <button
          onClick={handleToggleSubscribe}
          disabled={loading}
          className={`stamp-btn !py-1 !px-2.5 !text-[10px] flex items-center gap-1 ${
            isSubscribed ? '!bg-[#d97706] !text-black !border-[#d97706]' : ''
          }`}
        >
          {isSubscribed ? (
            <>
              <Check className="w-3 h-3" />
              <span>FOLLOWING</span>
            </>
          ) : (
            <>
              <Plus className="w-3 h-3" />
              <span>FOLLOW</span>
            </>
          )}
        </button>
      </div>

      {/* Description */}
      <p className="text-xs text-[#d6d0c2] font-sans leading-relaxed line-clamp-2">
        {channel.description || 'Telegram channel broadcast transmission.'}
      </p>

      {/* Footer Ledger */}
      <div className="flex items-center justify-between text-[10px] text-[#a39e93] pt-2 border-t border-[#262936]">
        <div className="flex items-center gap-1">
          <Users className="w-3 h-3 text-[#d97706]" />
          <span>{formatNumber(subCount)} SUBSCRIBERS</span>
        </div>

        {channel.postCount !== undefined && (
          <span>{formatNumber(channel.postCount)} DISPATCHES</span>
        )}
      </div>
    </div>
  );
}
