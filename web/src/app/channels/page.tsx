'use client';

import React, { useState, useEffect } from 'react';
import { TrackedChannel } from '@/lib/types';
import { ChannelCard } from '@/components/channel-card';
import { Radio, Search, Loader2 } from 'lucide-react';

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
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Radio className="w-4 h-4" />
            <span>Kingdom Radio Network</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-zinc-100">
            Channel Directory
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Browse and subscribe to verified Telegram dispatches.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search channels..."
            className="w-full py-2.5 pl-9 pr-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500/50"
          />
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-3.5" />
        </div>
      </div>

      {/* Channel Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-amber-400">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : channels.length === 0 ? (
        <div className="glass-panel rounded-3xl p-12 text-center flex flex-col items-center justify-center gap-3">
          <span className="text-4xl">📡</span>
          <h3 className="font-extrabold text-base text-zinc-100">No channels found</h3>
          <p className="text-xs text-zinc-400">
            No channels matched your search filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {channels.map((ch) => (
            <ChannelCard key={ch.id} channel={ch} />
          ))}
        </div>
      )}
    </div>
  );
}
