'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, Flame, RefreshCw } from 'lucide-react';

interface BabiometerProps {
  channel?: string;
}

export function BabiometerWidget({ channel = 'dagmawi_babi' }: BabiometerProps) {
  const [postCount, setPostCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch today's post count
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

  // Compute trumpet blasts and volume rating
  const getVolumeLevel = (count: number) => {
    if (count === 0) return { blasts: '🔇', verdict: 'Deafening silence. Charging up a 50-post midnight storm.', level: 'Zero' };
    if (count <= 3) return { blasts: '🎺', verdict: 'A calm whisper from the throne. Calibration phase.', level: 'Mild' };
    if (count <= 8) return { blasts: '🎺🎺', verdict: 'A brisk morning warm-up.', level: 'Active' };
    if (count <= 15) return { blasts: '🎺🎺🎺', verdict: 'CODE ORANGE. Keyboard is actively smoking.', level: 'High' };
    if (count <= 25) return { blasts: '🎺🎺🎺🎺', verdict: 'CODE CRIMSON. Lock screens vibrating nationwide.', level: 'Deluge' };
    return { blasts: '🎺🎺🎺🎺🎺 🚨', verdict: 'DEFCON 1: APOCALYPTIC BROADCAST EVENT.', level: 'Extreme' };
  };

  const volume = getVolumeLevel(postCount);

  return (
    <div className="glass-panel rounded-3xl p-5 border border-amber-500/30 flex flex-col gap-4 relative overflow-hidden bg-gradient-to-br from-amber-500/10 via-zinc-950/80 to-zinc-950/95 shadow-xl">
      {/* Background ambient glow */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-sm">
            🎺
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-zinc-100 uppercase tracking-wide">
              The Babi-O-Meter
            </h3>
            <p className="text-[11px] text-zinc-400">Activity index for @{channel}</p>
          </div>
        </div>

        <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">
          {volume.level}
        </span>
      </div>

      {/* Trumpet Visual Gauge */}
      <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-center gap-2">
        <div className="text-2xl tracking-widest">{volume.blasts}</div>
        <div className="text-xl font-black text-amber-400">
          {loading ? '...' : `${postCount} Posts Today`}
        </div>
        <p className="text-xs text-zinc-400 italic max-w-xs leading-relaxed">
          &ldquo;{volume.verdict}&rdquo;
        </p>
      </div>
    </div>
  );
}
