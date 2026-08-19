'use client';

import React, { useState, useEffect } from 'react';
import { Activity, BarChart2 } from 'lucide-react';

interface BabiometerProps {
  channel?: string;
}

export function BabiometerWidget({ channel = 'dagmawi_babi' }: BabiometerProps) {
  const [postCount, setPostCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/posts?channel=${channel}&limit=50`)
      .then((res) => res.json())
      .then((data) => {
        if (data.posts) {
          const todayStr = new Date().toISOString().split('T')[0];
          const todayPosts = data.posts.filter((p: any) => p.localDate === todayStr);
          setPostCount(todayPosts.length > 0 ? todayPosts.length : data.posts.length);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [channel]);

  const getVolumeLevel = (count: number) => {
    if (count === 0) return { verdict: 'Quiet baseline. No new dispatches logged today.', level: 'Baseline', percent: 8 };
    if (count <= 3) return { verdict: 'Low frequency broadcast mode.', level: 'Moderate', percent: 28 };
    if (count <= 8) return { verdict: 'Standard editorial rhythm.', level: 'Active', percent: 55 };
    if (count <= 15) return { verdict: 'High output velocity.', level: 'High Velocity', percent: 75 };
    if (count <= 25) return { verdict: 'Heavy broadcast deluge.', level: 'Surge', percent: 90 };
    return { verdict: 'Peak broadcast event volume.', level: 'Peak Output', percent: 100 };
  };

  const volume = getVolumeLevel(postCount);

  return (
    <div className="editorial-card p-5 flex flex-col gap-3.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300">
            <Activity className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="font-semibold text-xs text-zinc-200">
              Activity Index
            </h3>
            <p className="text-[11px] text-zinc-500">Volume index for @{channel}</p>
          </div>
        </div>

        <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 font-medium">
          {volume.level}
        </span>
      </div>

      {/* Progress & Stat */}
      <div className="flex flex-col gap-2 p-3.5 rounded-lg bg-zinc-900/60 border border-white/[0.04]">
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-400 font-medium">Daily Dispatch Count</span>
          <span className="text-sm font-bold text-white">
            {loading ? '—' : `${postCount} Posts`}
          </span>
        </div>

        {/* Minimal Progress Bar */}
        <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-zinc-300 transition-all duration-700 ease-out"
            style={{ width: `${volume.percent}%` }}
          />
        </div>

        <p className="text-[11px] text-zinc-500 font-normal mt-0.5">
          {volume.verdict}
        </p>
      </div>
    </div>
  );
}
