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
    <div className="glass-card rounded-3xl p-6 border border-amber-500/35 flex flex-col gap-4 relative overflow-hidden bg-gradient-to-br from-amber-500/20 via-zinc-950/80 to-zinc-950 shadow-2xl royal-glow">
      {/* Ambient Radial Mesh Glow */}
      <div className="absolute -top-16 -right-16 w-48 h-48 bg-amber-500/25 rounded-full blur-3xl pointer-events-none animate-ambient-glow" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black text-xl border border-amber-500/40 shadow-inner">
            🎺
          </div>
          <div className="flex flex-col">
            <h3 className="font-black text-sm text-zinc-100 uppercase tracking-wider flex items-center gap-1.5">
              <span>The Babi-O-Meter</span>
            </h3>
            <p className="text-[11px] font-semibold text-zinc-400">Activity Index for @{channel}</p>
          </div>
        </div>

        <span className="text-xs px-3.5 py-1.5 rounded-full neon-amber-pill font-black">
          {volume.level} Index
        </span>
      </div>

      {/* Progress Bar & Blasts */}
      <div className="flex flex-col gap-3 p-4.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-inner">
        <div className="flex items-center justify-between">
          <div className="text-xl sm:text-2xl tracking-widest">{volume.blasts}</div>
          <div className="text-lg sm:text-2xl font-black text-gradient-amber">
            {loading ? '...' : `${postCount} Posts Today`}
          </div>
        </div>

        {/* Animated Bar */}
        <div className="w-full bg-zinc-800/90 h-3 rounded-full overflow-hidden p-0.5 border border-zinc-700/50">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${volume.color} transition-all duration-1000 ease-out shadow-sm`}
            style={{ width: `${volume.percent}%` }}
          />
        </div>

        <p className="text-xs text-zinc-200 italic text-center font-medium leading-relaxed mt-1">
          &ldquo;{volume.verdict}&rdquo;
        </p>
      </div>
    </div>
  );
}
