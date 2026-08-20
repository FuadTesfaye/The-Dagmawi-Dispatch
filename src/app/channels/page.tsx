'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { TrackedChannel } from '@/lib/types';
import { ChannelCard } from '@/components/channel-card';
import { Search, Loader2, Radio } from 'lucide-react';
import { fetchWithCache, getCached } from '@/lib/cache';

export default function ChannelsPage() {
  // Initialize immediately from memory cache if available (0ms loading!)
  const initialCache = getCached<{ channels: (TrackedChannel & { postCount?: number })[] }>('/api/channels');
  const [allChannels, setAllChannels] = useState<(TrackedChannel & { postCount?: number })[]>(
    initialCache.data?.channels || []
  );
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(!initialCache.data);

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

  // Instant 0ms local filter, memoized for high-fps typing
  const filteredChannels = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allChannels;
    return allChannels.filter(
      (c) =>
        c.id.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q))
    );
  }, [allChannels, search]);

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

      {/* Channels Grid */}
      {loading && allChannels.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-2 text-[var(--paper-muted)] font-teletype">
          <Loader2 className="w-6 h-6 animate-spin text-[#d97706]" />
          <span className="text-xs uppercase tracking-wider">[ Loading Publication Directory... ]</span>
        </div>
      ) : filteredChannels.length === 0 ? (
        <div className="broadsheet-card p-10 sm:p-14 text-center flex flex-col items-center justify-center gap-2 font-teletype">
          <h3 className="font-bold text-sm text-[var(--paper-cream)] uppercase">[ No Channels Found ]</h3>
          <p className="text-xs text-[var(--paper-muted)] font-sans">No registry records matched your search query.</p>
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
