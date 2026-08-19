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
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-1 block">
            Channel Index
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-white">
            Monitored Publications
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Discover and subscribe to tracked Telegram broadcasts across the network.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter channels..."
            className="w-full py-1.5 pl-8 pr-3 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
          />
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-zinc-500">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
        </div>
      ) : channels.length === 0 ? (
        <div className="editorial-card p-12 text-center flex flex-col items-center justify-center gap-2">
          <h3 className="font-semibold text-sm text-zinc-200">No channels found</h3>
          <p className="text-xs text-zinc-500">No channels matched your search.</p>
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
