'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { TrackedChannel } from '@/lib/types';
import { useAuth, useToast } from './providers';
import { formatNumber } from '@/lib/utils';
import { Check, Plus, Users, ArrowUpRight, Bell, BellOff, Volume2, VolumeX } from 'lucide-react';
import { useChannelMute } from '@/lib/mute-store';

interface ChannelCardProps {
  channel: TrackedChannel & { postCount?: number };
}

export const ChannelCard = React.memo(function ChannelCard({ channel }: ChannelCardProps) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [isSubscribed, setIsSubscribed] = useState(channel.isSubscribed || false);
  const [subCount, setSubCount] = useState(channel.subscriberCount || 0);
  const [loading, setLoading] = useState(false);

  const { isMuted, toggle: toggleMute } = useChannelMute(channel.id, channel.isMuted);

  const handleToggleSubscribe = async () => {
    if (!user) {
      showToast('Authentication required to follow channel', 'info');
      return;
    }

    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(30);
    }

    setLoading(true);
    const nextSub = !isSubscribed;
    setIsSubscribed(nextSub);
    setSubCount((prev) => (nextSub ? prev + 1 : Math.max(0, prev - 1)));

    try {
      const res = await fetch(`/api/channels/${channel.id}/subscribe`, {
        method: 'POST',
      });

      if (res.ok) {
        const data = await res.json();
        setIsSubscribed(data.isSubscribed);
        setSubCount(data.subscriberCount);
        showToast(
          data.isSubscribed ? `Now following @${channel.id}` : `Unfollowed @${channel.id}`,
          'success'
        );
      }
    } catch {
      showToast('Failed to update subscription', 'error');
      setIsSubscribed(channel.isSubscribed || false);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMute = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(20);
    }

    const nextMuted = await toggleMute();
    showToast(
      nextMuted ? `Muted @${channel.id} transmissions` : `Unmuted @${channel.id}`,
      nextMuted ? 'info' : 'success'
    );
  };

  return (
    <div
      className={`broadsheet-card p-4 sm:p-5 flex flex-col justify-between gap-3.5 font-teletype group transition-all ${
        isMuted ? 'opacity-75 border-dashed' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2.5">
        <Link href={`/channel/${channel.id}`} className="flex items-center gap-3 min-w-0 flex-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <div className="relative shrink-0">
            <img
              src={
                channel.avatarUrl ||
                `https://api.dicebear.com/7.x/bottts/svg?seed=${channel.id}`
              }
              alt={channel.name}
              className="w-11 h-11 sm:w-12 sm:h-12 border-2 border-[var(--ink-border)] bg-[var(--ink-bg)] object-cover rounded-sm"
            />
            {isMuted && (
              <div
                className="absolute -bottom-1 -right-1 bg-red-600 text-white p-0.5 rounded-full border border-[var(--ink-bg)]"
                title="Channel Muted"
              >
                <VolumeX className="w-2.5 h-2.5" />
              </div>
            )}
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-bold text-xs sm:text-sm text-[var(--paper-cream)] uppercase group-hover:text-[#d97706] transition-colors truncate">
                {channel.name}
              </h3>
              {channel.isVerified && (
                <span className="text-[#d97706] text-[10px] font-bold" title="Verified Publication">
                  [V]
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[var(--paper-muted)] truncate">@{channel.id}</span>
              {isMuted && (
                <span className="text-[9px] text-red-400 border border-red-500/40 px-1 py-0.2 uppercase font-bold">
                  MUTED
                </span>
              )}
            </div>
          </div>
        </Link>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Mute / Unmute Button */}
          <button
            onClick={handleToggleMute}
            title={isMuted ? 'Unmute Channel' : 'Mute Channel'}
            className={`stamp-btn !py-1 !px-2 !text-xs flex items-center gap-1 active:scale-95 transition-colors ${
              isMuted
                ? '!bg-red-950/60 !text-red-300 !border-red-600/50 hover:!bg-red-900/60'
                : '!bg-[var(--card-bg)] !text-[var(--paper-muted)] hover:!text-[var(--paper-cream)]'
            }`}
          >
            {isMuted ? (
              <>
                <BellOff className="w-3.5 h-3.5 text-red-400" />
                <span className="hidden sm:inline">MUTED</span>
              </>
            ) : (
              <>
                <Bell className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">MUTE</span>
              </>
            )}
          </button>

          {/* Follow Button */}
          <button
            onClick={handleToggleSubscribe}
            disabled={loading}
            className={`stamp-btn !py-1 !px-2.5 !text-xs flex items-center gap-1 active:scale-95 ${
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
                <span>FOLLOW</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-[var(--paper-muted)] leading-relaxed line-clamp-2 font-sans">
        {channel.description || 'Public Telegram broadcast feed indexed for autonomous intelligence.'}
      </p>

      {/* Footer Metrics */}
      <div className="flex items-center justify-between text-[10px] text-[var(--paper-muted)] pt-2.5 border-t border-[var(--ink-border)] uppercase">
        <div className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-[#d97706]" />
          <span>{formatNumber(subCount)} FOLLOWERS</span>
        </div>

        <Link
          href={`/channel/${channel.id}`}
          className="text-[#d97706] hover:underline flex items-center gap-0.5 font-bold"
        >
          <span>VIEW WIRE</span>
          <ArrowUpRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
});
