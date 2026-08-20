'use client';

import React, { useState, useEffect } from 'react';
import { TrackedChannel } from '@/lib/types';
import { ChannelCard } from '@/components/channel-card';
import { Search, Loader2, Radio } from 'lucide-react';

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
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 flex flex-col gap-6 sm:gap-8 font-teletype">
      {/* Header Banner */}
      <div className="p-4 sm:p-8 bg-[#12141c] border-2 border-[#262936] shadow-[4px_4px_0px_0px_#000000] sm:shadow-[6px_6px_0px_0px_#000000] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6">
        <div className="flex flex-col gap-1.5 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 stamp-badge-gold stamp-badge text-[10px] sm:text-xs self-start">
            <Radio className="w-3.5 h-3.5" />
            <span>PUBLICATION REGISTRY & CHANNEL DIRECTORY</span>
          </div>
          <h1 className="font-broadsheet font-black text-2xl sm:text-4xl text-[#f4f0e6] tracking-tight uppercase">
            Monitored Publications
          </h1>
          <p className="text-xs sm:text-sm text-[#a39e93] leading-relaxed font-sans">
            Explore verified and community-indexed Telegram channels ingested into the autonomous archive for real-time AI summarization.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72 shrink-0">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search handles & names..."
            className="w-full py-2 pl-9 pr-3 bg-[#0c0d10] border border-[#262936] text-xs text-[#f4f0e6] placeholder-[#6b665c] font-teletype uppercase focus:outline-none focus:border-[#d97706]"
          />
          <Search className="w-3.5 h-3.5 text-[#a39e93] absolute left-3 top-2.5" />
        </div>
      </div>

      {/* Channels Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-2 text-[#a39e93] font-teletype">
          <Loader2 className="w-6 h-6 animate-spin text-[#d97706]" />
          <span className="text-xs uppercase tracking-wider">[ Loading Publication Directory... ]</span>
        </div>
      ) : channels.length === 0 ? (
        <div className="broadsheet-card p-10 sm:p-14 text-center flex flex-col items-center justify-center gap-2 font-teletype">
          <h3 className="font-bold text-sm text-[#f4f0e6] uppercase">[ No Channels Found ]</h3>
          <p className="text-xs text-[#a39e93] font-sans">No registry records matched your search query.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5">
          {channels.map((ch) => (
            <ChannelCard key={ch.id} channel={ch} />
          ))}
        </div>
      )}
    </div>
  );
}
