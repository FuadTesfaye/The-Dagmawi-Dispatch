'use client';

import React, { useState, useEffect } from 'react';
import { Trophy, Crown, Flame, Award, ChevronRight, Sparkles } from 'lucide-react';
import { WeeklyLeaderboardEntry } from '@/lib/types';
import Link from 'next/link';

export function WeeklyLeaderboardWidget() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/leaderboard')
      .then((res) => res.json())
      .then((resData) => setData(resData))
      .catch((err) => console.warn('[Leaderboard] error:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) return null;

  return (
    <div className="broadsheet-card p-4 sm:p-5 border-2 border-[var(--ink-border)] shadow-[4px_4px_0px_0px_var(--shadow-color)] font-teletype flex flex-col gap-3.5">
      <div className="flex items-center justify-between border-b border-[var(--ink-border)] pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 border border-[#d97706] bg-[#241c10] text-[#d97706] flex items-center justify-center rounded-sm">
            <Trophy className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-[#d97706] uppercase tracking-wider block">
              WEEKLY ROLLUP · WEEK {data.weekNumber || 34}
            </span>
            <h4 className="font-broadsheet font-black text-sm text-[var(--paper-cream)] uppercase">
              Court Honor Roll
            </h4>
          </div>
        </div>

        <span className="text-[9px] text-[var(--paper-muted)] font-mono">
          Resets Sun 00:00 UTC
        </span>
      </div>

      {/* Leaderboard Lists */}
      <div className="flex flex-col gap-2">
        <span className="text-[10px] text-[var(--paper-muted)] uppercase font-bold">
          TOP SCRIBES (COMMENT ENGAGEMENT):
        </span>
        <div className="flex flex-col gap-1.5 font-sans text-xs">
          {(data.topCommentators || []).slice(0, 3).map((item: any) => (
            <div
              key={item.rank}
              className="p-2 bg-[var(--subtle-bg)] border border-[var(--ink-border)] flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <span className="font-teletype font-bold text-xs text-[#d97706] w-4">
                  #{item.rank}
                </span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.avatar}
                  alt={item.name}
                  className="w-5 h-5 rounded-full object-cover border border-[var(--ink-border)]"
                />
                <span className="font-bold text-[var(--paper-cream)] truncate max-w-[120px]">
                  {item.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-teletype text-[#d97706] font-bold">
                  {item.badge}
                </span>
                <span className="text-[10px] font-mono text-[var(--paper-muted)]">
                  {item.score} pts
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
