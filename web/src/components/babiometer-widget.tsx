'use client';

import React, { useState, useEffect } from 'react';
import { Radio } from 'lucide-react';

interface LurkometerProps {
  channel?: string;
}

export function BabiometerWidget({ channel = 'dagmawi_babi' }: LurkometerProps) {
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
    if (count === 0) return { blocks: '░░░░░░░░░░', verdict: 'SILENCE ACROSS THE CHANNEL WIRES. OBSERVING IN THE SHADOWS.', level: 'QUIET', percent: 0 };
    if (count <= 3) return { blocks: '██░░░░░░░░', verdict: 'MILD TELETYPE BROADCAST VELOCITY RECORDED.', level: 'MODERATE', percent: 20 };
    if (count <= 8) return { blocks: '█████░░░░░', verdict: 'STEADY TRANSMISSION FLOW ACROSS THE NETWORK.', level: 'ACTIVE', percent: 50 };
    if (count <= 15) return { blocks: '███████░░░', verdict: 'ELEVATED BROADCAST FLURRY DETECTED.', level: 'HIGH', percent: 75 };
    if (count <= 25) return { blocks: '█████████░', verdict: 'HIGH-FREQUENCY DIGITAL DELUGE ENGAGED.', level: 'DELUGE', percent: 90 };
    return { blocks: '██████████', verdict: 'CRITICAL APOCALYPTIC BROADCAST SURGE IN EFFECT.', level: 'PEAK', percent: 100 };
  };

  const volume = getVolumeLevel(postCount);

  return (
    <div className="broadsheet-card p-4 sm:p-5 flex flex-col gap-3 font-teletype w-full overflow-hidden">
      {/* Header Stamp */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#262936] pb-2.5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-[#d97706] shrink-0" />
          <span className="text-xs font-bold text-[#f4f0e6] uppercase tracking-wider truncate max-w-[200px] sm:max-w-none">
            Lurkometer Chrono // @{channel}
          </span>
        </div>
        <span className="stamp-badge-gold stamp-badge text-[10px]">
          {volume.level}
        </span>
      </div>

      {/* Mechanical Teletype Counter */}
      <div className="p-3 bg-[#0c0d10] border border-[#262936] flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs flex-wrap gap-1">
          <span className="text-[#a39e93] uppercase font-semibold text-[11px]">24-Hour Activity Gauge</span>
          <span className="font-bold text-[#f4f0e6] text-xs sm:text-sm">
            {loading ? 'CALCULATING...' : `[ ${postCount} TRANSMISSIONS ]`}
          </span>
        </div>

        {/* ASCII / Block Gauge */}
        <div className="text-xs sm:text-sm font-bold tracking-wider sm:tracking-widest text-[#f4f0e6] py-1 border-y border-[#262936] flex items-center justify-between overflow-x-hidden">
          <span className="text-[#d97706] select-none font-mono">{volume.blocks}</span>
          <span className="text-[11px] text-[#a39e93] shrink-0">{volume.percent}% CAPACITY</span>
        </div>

        <p className="text-[10px] text-[#a39e93] italic font-sans leading-relaxed">
          &ldquo;{volume.verdict}&rdquo;
        </p>
      </div>
    </div>
  );
}
