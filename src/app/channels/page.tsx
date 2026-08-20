'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { TrackedChannel } from '@/lib/types';
import { ChannelCard } from '@/components/channel-card';
import { Search, Loader2, Radio, BellOff, CheckCircle2, Globe } from 'lucide-react';
import { fetchWithCache, getCached } from '@/lib/cache';
import { useAllMutedChannels } from '@/lib/mute-store';

export default function ChannelsPage() {
  // Initialize immediately from memory cache if available (0ms loading!)
  const initialCache = getCached<{ channels: (TrackedChannel & { postCount?: number })[] }>('/api/channels');
  const [allChannels, setAllChannels] = useState<(TrackedChannel & { postCount?: number })[]>(
    initialCache.data?.channels || []
  );
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'following' | 'muted'>('all');
  const [loading, setLoading] = useState(!initialCache.data);

  const mutedChannelSet = useAllMutedChannels();

  // Fetch / Revalidate channels in background
  useEffect(() => {
    fetchWithCache<{ channels: (TrackedChannel & { postCount?: number })[] }>('/api/channels')
      .then((data) => {
        if (data?.channels) {
          setAllChannels(data.channels);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Filter channels based on search query and active tab
  const filteredChannels = useMemo(() => {
    const q = search.trim().toLowerCase();

    return allChannels.filter((c) => {
      const isMuted = mutedChannelSet.has(c.id.toLowerCase()) || !!c.isMuted;
      const isSubscribed = !!c.isSubscribed;

      // Filter Tab Check
      if (activeFilter === 'following' && !isSubscribed) return false;
      if (activeFilter === 'muted' && !isMuted) return false;

      // Search Query Check
      if (!q) return true;
      return (
        c.id.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q))
      );
    });
  }, [allChannels, search, activeFilter, mutedChannelSet]);

  const followingCount = useMemo(
    () => allChannels.filter((c) => c.isSubscribed).length,
    [allChannels]
  );
  const mutedCount = useMemo(
    () => allChannels.filter((c) => mutedChannelSet.has(c.id.toLowerCase()) || c.isMuted).length,
    [allChannels, mutedChannelSet]
  );

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 flex flex-col gap-6 sm:gap-8 font-teletype">
      {/* Header Banner */}
      <div className="p-4 sm:p-8 bg-[var(--card-bg)] border-2 border-[var(--ink-border-heavy)] shadow-[4px_4px_0px_0px_var(--shadow-color)] sm:shadow-[6px_6px_0px_0px_var(--shadow-color)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6">
        <div className="flex flex-col gap-1.5 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 stamp-badge-gold stamp-badge text-[10px] sm:text-xs self-start">
            <Radio className="w-3.5 h-3.5" />
            <span>PUBLICATION REGISTRY & CHANNEL DIRECTORY</span>
          </div>
          <h1 className="font-broadsheet font-black text-2xl sm:text-4xl text-[var(--paper-cream)] tracking-tight uppercase">
            Monitored Publications
          </h1>
          <p className="text-xs sm:text-sm text-[var(--paper-muted)] leading-relaxed font-sans">
            Explore verified and community-indexed Telegram channels ingested into the autonomous archive for real-time AI summarization.
          </p>
        </div>

        {/* Instant Search Input */}
        <div className="relative w-full md:w-72 shrink-0">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Instant search handles..."
            className="w-full py-2 pl-9 pr-3 bg-[var(--input-bg)] border border-[var(--ink-border)] text-xs text-[var(--paper-cream)] placeholder-[var(--paper-faint)] font-teletype uppercase focus:outline-none focus:border-[#d97706] transition-colors"
          />
          <Search className="w-3.5 h-3.5 text-[var(--paper-muted)] absolute left-3 top-2.5" />
        </div>
      </div>

      {/* Filter Tabs Bar */}
      <div className="flex items-center justify-between border-b border-[var(--ink-border)] pb-2 flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => setActiveFilter('all')}
            className={`stamp-btn !py-1.5 !px-3 text-xs font-bold flex items-center gap-1.5 active:scale-95 ${
              activeFilter === 'all' ? '!bg-[var(--paper-cream)] !text-[var(--ink-bg)]' : ''
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>ALL WIRES ({allChannels.length})</span>
          </button>

          <button
            onClick={() => setActiveFilter('following')}
            className={`stamp-btn !py-1.5 !px-3 text-xs font-bold flex items-center gap-1.5 active:scale-95 ${
              activeFilter === 'following' ? '!bg-[var(--paper-cream)] !text-[var(--ink-bg)]' : ''
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>FOLLOWING ({followingCount})</span>
          </button>

          <button
            onClick={() => setActiveFilter('muted')}
            className={`stamp-btn !py-1.5 !px-3 text-xs font-bold flex items-center gap-1.5 active:scale-95 ${
              activeFilter === 'muted'
                ? '!bg-red-950/80 !text-red-300 !border-red-500'
                : '!bg-[var(--card-bg)] !text-[var(--paper-muted)]'
            }`}
          >
            <BellOff className="w-3.5 h-3.5 text-red-400" />
            <span>MUTED ({mutedCount})</span>
          </button>
        </div>

        <span className="text-[10px] text-[var(--paper-muted)] uppercase hidden sm:inline">
          Showing {filteredChannels.length} publications
        </span>
      </div>

      {/* Channels Grid */}
      {loading && allChannels.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-2 text-[var(--paper-muted)] font-teletype">
          <Loader2 className="w-6 h-6 animate-spin text-[#d97706]" />
          <span className="text-xs uppercase tracking-wider">[ Loading Publication Directory... ]</span>
        </div>
      ) : filteredChannels.length === 0 ? (
        <div className="broadsheet-card p-10 sm:p-14 text-center flex flex-col items-center justify-center gap-2 font-teletype">
          <h3 className="font-bold text-sm text-[var(--paper-cream)] uppercase">
            {activeFilter === 'muted'
              ? '[ No Muted Publications ]'
              : activeFilter === 'following'
              ? '[ No Followed Publications ]'
              : '[ No Channels Found ]'}
          </h3>
          <p className="text-xs text-[var(--paper-muted)] font-sans">
            {activeFilter === 'muted'
              ? 'You have not muted any Telegram channels.'
              : activeFilter === 'following'
              ? 'You have not followed any Telegram channels yet.'
              : 'No registry records matched your search query.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5">
          {filteredChannels.map((ch) => (
            <ChannelCard key={ch.id} channel={ch} />
          ))}
        </div>
      )}
    </div>
  );
}
