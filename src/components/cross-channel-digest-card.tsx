'use client';

import React, { useState, useEffect } from 'react';
import { BookOpen, Sparkles, Radio, Check, ChevronDown, ChevronUp, BellRing } from 'lucide-react';
import { useAuth, useToast } from './providers';
import { CrossChannelDigest } from '@/lib/types';
import Link from 'next/link';

export function CrossChannelDigestCard() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [digest, setDigest] = useState<CrossChannelDigest | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetch('/api/digest')
      .then((res) => res.json())
      .then((data) => {
        if (data.digest) setDigest(data.digest);
      })
      .catch((err) => console.warn('[DigestCard] fetch error:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !digest) return null;

  return (
    <div className="broadsheet-card p-4 sm:p-6 border-2 border-[var(--ink-border-heavy)] shadow-[4px_4px_0px_0px_var(--shadow-color)] font-teletype flex flex-col gap-3.5">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--ink-border)] pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 border border-[var(--ink-border-heavy)] bg-[var(--paper-cream)] text-[var(--ink-bg)] flex items-center justify-center font-bold text-xs rounded-sm">
            §
          </div>
          <div>
            <span className="text-[10px] font-bold text-[#d97706] tracking-wider uppercase block">
              ROYAL MORNING BRIEF · CROSS-CHANNEL DIGEST
            </span>
            <h3 className="font-broadsheet font-black text-sm sm:text-base text-[var(--paper-cream)] uppercase">
              {digest.headline}
            </h3>
          </div>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="stamp-btn !py-1 !px-2 text-xs flex items-center gap-1 active:scale-95"
        >
          <span>{expanded ? 'COLLAPSE' : 'FULL BRIEF'}</span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      <p className="text-xs text-[var(--paper-muted)] font-sans leading-relaxed">
        {digest.overviewSummary}
      </p>

      {/* Expanded Per-Channel Story Matrix */}
      {expanded && (
        <div className="flex flex-col gap-2.5 pt-2 border-t border-[var(--ink-border)] animate-in fade-in-50 duration-200">
          <span className="text-[10px] text-[var(--paper-muted)] uppercase font-bold tracking-wider">
            TRACKED CHANNEL ROUNDUP:
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {digest.channelHighlights.map((ch, idx) => (
              <Link
                key={idx}
                href={`/channel/${ch.channel}`}
                className="p-3 bg-[var(--subtle-bg)] border border-[var(--ink-border)] hover:border-[#d97706] transition-all flex flex-col justify-between gap-1.5 group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[var(--paper-cream)] group-hover:text-[#d97706] transition-colors truncate">
                    {ch.channelName}
                  </span>
                  <span className="text-[10px] text-[#d97706] font-mono font-bold">
                    {ch.postCount} posts
                  </span>
                </div>
                <p className="text-[11px] text-[var(--paper-muted)] font-sans line-clamp-2">
                  {ch.topStory}
                </p>
                <span className="text-[9px] text-[var(--paper-faint)] font-mono">
                  Rating: {ch.chaosRating}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
