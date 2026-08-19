'use client';

import React, { useState, useEffect } from 'react';
import { TrackedChannel } from '@/lib/types';
import { ChannelCard } from '@/components/channel-card';
import { Search, Loader2 } from 'lucide-react';

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
    <div className="flex flex-col gap-6 max-w-4xl mx-auto font-teletype">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b-2 border-[#262936] pb-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#d97706] mb-1 block">
            § SECTION II: CHANNEL LEDGER
          </span>
          <h1 className="font-broadsheet font-black text-2xl sm:text-3xl text-[#f4f0e6] uppercase">
            Monitored Publication Registry
          </h1>
          <p className="text-xs text-[#a39e93] mt-0.5">
            Verified channels indexed for automatic teletype summarization.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="FILTER REGISTRY..."
            className="w-full py-1.5 pl-8 pr-3 bg-[#12141c] border border-[#262936] text-xs text-[#f4f0e6] placeholder-[#6b665c] font-teletype uppercase focus:outline-none focus:border-[#f4f0e6]"
          />
          <Search className="w-3.5 h-3.5 text-[#a39e93] absolute left-2.5 top-2.5" />
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-[#a39e93]">
          <Loader2 className="w-6 h-6 animate-spin text-[#d97706]" />
        </div>
      ) : channels.length === 0 ? (
        <div className="broadsheet-card p-12 text-center flex flex-col items-center justify-center gap-2">
          <h3 className="font-bold text-sm text-[#f4f0e6] uppercase">[ NO CHANNELS REGISTERED ]</h3>
          <p className="text-xs text-[#a39e93]">No registry records matched your query.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {channels.map((ch) => (
            <ChannelCard key={ch.id} channel={ch} />
          ))}
        </div>
      )}
    </div>
  );
}
