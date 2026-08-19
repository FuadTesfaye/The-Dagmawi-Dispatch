'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, Flame, Volume2, Shield } from 'lucide-react';

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
    if (count === 0) return { blasts: '🔇', verdict: 'Deafening silence. Charging up a 50-post storm for midnight.', level: 'Quiet', percent: 5, color: 'from-zinc-600 to-zinc-500' };
    if (count <= 3) return { blasts: '🎺', verdict: 'A deceptive whisper from the throne. Calibration phase.', level: 'Mild', percent: 25, color: 'from-emerald-500 to-amber-500' };
    if (count <= 8) return { blasts: '🎺🎺', verdict: 'A casual morning warm-up for the scribes.', level: 'Active', percent: 55, color: 'from-amber-400 to-amber-500' };
    if (count <= 15) return { blasts: '🎺🎺🎺', verdict: 'CODE ORANGE. Lock screens vibrating in unison.', level: 'High', percent: 75, color: 'from-amber-500 to-amber-600' };
    if (count <= 25) return { blasts: '🎺🎺🎺🎺', verdict: 'CODE CRIMSON. High-frequency digital deluge.', level: 'Deluge', percent: 90, color: 'from-amber-600 to-rose-500' };
    return { blasts: '🎺🎺🎺🎺🎺 🚨', verdict: 'DEFCON 1: APOCALYPTIC BROADCAST EVENT.', level: 'Extreme', percent: 100, color: 'from-rose-500 to-rose-600' };
  };

  const volume = getVolumeLevel(postCount);

  return (
    <div className="glass-card rounded-3xl p-5 sm:p-6 border border-amber-500/30 flex flex-col gap-4 relative overflow-hidden bg-gradient-to-br from-amber-500/15 via-zinc-950/80 to-zinc-950 shadow-2xl">
      {/* Ambient Radial Mesh Glow */}
      <div className="absolute -top-16 -right-16 w-40 h-40 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-lg border border-amber-500/40 shadow-inner">
            🎺
          </div>
          <div className="flex flex-col">
            <h3 className="font-black text-sm text-zinc-100 uppercase tracking-wider flex items-center gap-1.5">
              <span>The Babi-O-Meter</span>
            </h3>
            <p className="text-[11px] font-semibold text-zinc-400">Activity Index for @{channel}</p>
          </div>
        </div>

        <span className="text-xs px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 font-extrabold border border-amber-500/40 shadow-sm">
          {volume.level} Index
        </span>
      </div>

      {/* Progress Bar & Blasts */}
      <div className="flex flex-col gap-3 p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="text-xl sm:text-2xl tracking-widest">{volume.blasts}</div>
          <div className="text-lg sm:text-xl font-black text-amber-400">
            {loading ? '...' : `${postCount} Posts Today`}
          </div>
        </div>

        {/* Animated Bar */}
        <div className="w-full bg-zinc-800 h-2.5 rounded-full overflow-hidden p-0.5">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${volume.color} transition-all duration-1000 ease-out`}
            style={{ width: `${volume.percent}%` }}
          />
        </div>

        <p className="text-xs text-zinc-300 italic text-center font-medium leading-relaxed mt-1">
          &ldquo;{volume.verdict}&rdquo;
        </p>
      </div>
    </div>
  );
}
