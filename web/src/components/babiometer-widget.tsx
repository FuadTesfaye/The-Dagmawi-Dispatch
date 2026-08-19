'use client';

import React, { useState, useEffect } from 'react';
import { Radio, Gauge } from 'lucide-react';

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
    if (count === 0) return { blocks: '░░░░░░░░░░', verdict: 'SILENCE FROM THE ROYAL SCRIBE. GATHERING STORM FOR MIDNIGHT.', level: 'DORMANT', percent: 0 };
    if (count <= 3) return { blocks: '██░░░░░░░░', verdict: 'MILD TELETYPE BROADCAST CALIBRATION.', level: 'MODERATE', percent: 20 };
    if (count <= 8) return { blocks: '█████░░░░░', verdict: 'STANDARD BROADCAST VELOCITY IN EFFECT.', level: 'ACTIVE', percent: 50 };
    if (count <= 15) return { blocks: '███████░░░', verdict: 'ELEVATED DISPATCH FLURRY ACROSS THE WIRES.', level: 'HIGH', percent: 75 };
    if (count <= 25) return { blocks: '█████████░', verdict: 'HIGH-FREQUENCY DIGITAL DELUGE ENGAGED.', level: 'DELUGE', percent: 90 };
    return { blocks: '██████████', verdict: 'DEFCON 1: CRITICAL APOCALYPTIC BROADCAST SURGE.', level: 'PEAK', percent: 100 };
  };

  const volume = getVolumeLevel(postCount);

  return (
    <div className="broadsheet-card p-4 sm:p-5 flex flex-col gap-3 font-teletype">
      {/* Header Stamp */}
      <div className="flex items-center justify-between border-b border-[#262936] pb-2.5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-[#d97706]" />
          <span className="text-xs font-bold text-[#f4f0e6] uppercase tracking-wider">
            Teletype Chronometer // @{channel}
          </span>
        </div>
        <span className="stamp-badge-gold stamp-badge">
          LEVEL: {volume.level}
        </span>
      </div>

      {/* Mechanical Teletype Counter */}
      <div className="p-3 bg-[#0c0d10] border border-[#262936] flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#a39e93] uppercase font-semibold">24-Hour Dispatch Ticker</span>
          <span className="font-bold text-[#f4f0e6] text-sm">
            {loading ? 'CALCULATING...' : `[ ${postCount} TRANSMISSIONS ]`}
          </span>
        </div>

        {/* ASCII / Block Gauge */}
        <div className="text-sm font-bold tracking-widest text-[#f4f0e6] py-1 border-y border-[#262936] flex items-center justify-between">
          <span className="text-[#d97706]">{volume.blocks}</span>
          <span className="text-xs text-[#a39e93]">{volume.percent}% CAPACITY</span>
        </div>

        <p className="text-[10px] text-[#a39e93] italic font-sans leading-relaxed">
          &ldquo;{volume.verdict}&rdquo;
        </p>
      </div>
    </div>
  );
}
