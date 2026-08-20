'use client';

import React, { useState, useEffect } from 'react';
import { TrackedChannel } from '@/lib/types';
import { ChannelCard } from '@/components/channel-card';
import { Search, Loader2, Radio, Plus } from 'lucide-react';
import Link from 'next/link';

export default function ChannelsPage() {
  const [channels, setChannels] = useState<(TrackedChannel & { postCount?: number })[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const query = search.trim() ? `?q=${encodeURIComponent(search.trim())}` : '';
    setLoading(true);

    fetch(`/api/channels${query}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.channels) {
          setChannels(data.channels);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search]);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex flex-col gap-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 pb-6 border-b border-[#1f2330]">
        <div className="flex flex-col gap-2 max-w-2xl">
          <div className="flex items-center gap-2 font-teletype text-xs text-[#d97706] uppercase tracking-wider font-semibold">
            <Radio className="w-4 h-4" />
            <span>Publication Registry & Channel Ledger</span>
          </div>
          <h1 className="font-broadsheet font-black text-3xl sm:text-4xl text-[#f4f0e6] tracking-tight uppercase">
            Monitored Publications
          </h1>
          <p className="text-sm text-[#a39e93] leading-relaxed">
            Explore verified and community-indexed Telegram channels ingested into the autonomous archive for real-time AI summarization.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-80 font-teletype">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search channels & handles..."
            className="w-full py-2 pl-9 pr-4 bg-[#12141c] border border-[#1f2330] rounded-full text-xs text-[#f4f0e6] placeholder-[#6b665c] focus:outline-none focus:border-[#d97706] transition-colors"
          />
          <Search className="w-4 h-4 text-[#a39e93] absolute left-3 top-2.5" />
        </div>
      </div>

      {/* Channels Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-28 gap-3 text-[#a39e93] font-teletype">
          <Loader2 className="w-7 h-7 animate-spin text-[#d97706]" />
          <span className="text-xs uppercase tracking-wider">[ Loading Publication Directory... ]</span>
        </div>
      ) : channels.length === 0 ? (
        <div className="substack-card p-14 text-center rounded-2xl flex flex-col items-center justify-center gap-2 font-teletype">
          <h3 className="font-bold text-sm text-[#f4f0e6] uppercase">[ No Channels Found ]</h3>
          <p className="text-xs text-[#a39e93]">No registry records matched your search query.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {channels.map((ch) => (
            <ChannelCard key={ch.id} channel={ch} />
          ))}
        </div>
      )}
    </div>
  );
}
