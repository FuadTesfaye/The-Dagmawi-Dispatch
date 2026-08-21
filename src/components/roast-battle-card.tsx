'use client';

import React, { useState, useEffect } from 'react';
import { Swords, Flame, Sparkles, Check, Share2, Trophy, Loader2 } from 'lucide-react';
import { useAuth, useToast } from './providers';
import { RoastBattle } from '@/lib/types';

export function RoastBattleCard() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [battle, setBattle] = useState<RoastBattle | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);

  useEffect(() => {
    fetch('/api/battles')
      .then((res) => res.json())
      .then((data) => {
        if (data.battle) setBattle(data.battle);
      })
      .catch((err) => console.warn('[RoastBattle] fetch error:', err))
      .finally(() => setLoading(false));
  }, []);

  const handleVote = async (target: 'A' | 'B') => {
    if (!battle) return;
    if (!user) {
      showToast('Please sign in to cast your vote in the Roast Battle!', 'info');
      return;
    }

    setVoting(true);
    try {
      const res = await fetch(`/api/battles/${battle.id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ votedFor: target }),
      });

      if (res.ok) {
        const data = await res.json();
        setBattle((prev) =>
          prev
            ? {
                ...prev,
                userVote: target,
                channelAVotes: data.channelAVotes,
                channelBVotes: data.channelBVotes,
              }
            : null
        );
        showToast(`Vote recorded for ${target === 'A' ? (battle as any).channelAName || battle.channelA : (battle as any).channelBName || battle.channelB}!`, 'success');
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || 'Failed to vote', 'error');
      }
    } catch {
      showToast('Network error casting vote', 'error');
    } finally {
      setVoting(false);
    }
  };

  const handleShare = () => {
    if (typeof window === 'undefined') return;
    if (navigator.share) {
      navigator.share({
        title: battle?.title || 'Roast Battle — The Lurkening',
        text: `Who posted more chaos this week? Vote now on The Lurkening:`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      showToast('Battle link copied to clipboard!', 'success');
    }
  };

  if (loading || !battle) return null;

  const totalVotes = (battle.channelAVotes || 0) + (battle.channelBVotes || 0);
  const percentA = totalVotes > 0 ? Math.round(((battle.channelAVotes || 0) / totalVotes) * 100) : 50;
  const percentB = 100 - percentA;

  const nameA = (battle as any).channelAName || `@${battle.channelA}`;
  const nameB = (battle as any).channelBName || `@${battle.channelB}`;

  return (
    <div className="broadsheet-card p-4 sm:p-6 border-2 border-[#d97706]/70 shadow-[4px_4px_0px_0px_var(--shadow-color)] font-teletype relative overflow-hidden flex flex-col gap-4">
      {/* Top Banner Tag */}
      <div className="flex items-center justify-between gap-2 border-b border-[var(--ink-border)] pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 border border-[#d97706] bg-[#241c10] text-[#d97706] flex items-center justify-center rounded-sm">
            <Swords className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-[#d97706] uppercase tracking-wider block">
              WEEKLY DUEL · ROAST BATTLE ARENA
            </span>
            <h3 className="font-broadsheet font-black text-base sm:text-lg text-[var(--paper-cream)] uppercase">
              {battle.title}
            </h3>
          </div>
        </div>

        <button
          onClick={handleShare}
          className="stamp-btn !py-1 !px-2 text-xs flex items-center gap-1 text-[var(--paper-muted)] hover:text-[var(--paper-cream)] active:scale-95"
          title="Share battle"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">SHARE DUEL</span>
        </button>
      </div>

      <p className="text-xs text-[var(--paper-muted)] font-sans leading-relaxed">
        {battle.description || 'Who posted more chaos and unhinged transmissions this week? Cast your sovereign vote below!'}
      </p>

      {/* Versus Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* Contender A */}
        <div className={`p-3.5 border transition-all flex flex-col justify-between gap-3 ${
          battle.userVote === 'A'
            ? 'border-[#d97706] bg-[#241c10]/70 shadow-[3px_3px_0px_0px_var(--shadow-color)]'
            : 'border-[var(--ink-border)] bg-[var(--subtle-bg)]'
        }`}>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="font-broadsheet font-bold text-sm text-[var(--paper-cream)] uppercase truncate">
                {nameA}
              </span>
              <span className="font-mono text-xs font-bold text-[#d97706]">
                {percentA}% ({battle.channelAVotes} votes)
              </span>
            </div>
            <p className="text-xs text-[var(--paper-muted)] font-sans italic">
              &quot;{battle.channelARoast || `Continuous transmissions and endless essays on the wire.`}&quot;
            </p>
          </div>

          <button
            onClick={() => handleVote('A')}
            disabled={voting}
            className={`stamp-btn w-full !py-2 text-xs font-bold active:scale-95 flex items-center justify-center gap-1.5 ${
              battle.userVote === 'A'
                ? '!bg-[#d97706] !text-black !border-[#d97706]'
                : 'hover:border-[#d97706]'
            }`}
          >
            {battle.userVote === 'A' ? <Check className="w-3.5 h-3.5" /> : <Flame className="w-3.5 h-3.5 text-[#d97706]" />}
            <span>{battle.userVote === 'A' ? 'VOTED FOR CHAOS' : `VOTE FOR ${nameA.toUpperCase()}`}</span>
          </button>
        </div>

        {/* Contender B */}
        <div className={`p-3.5 border transition-all flex flex-col justify-between gap-3 ${
          battle.userVote === 'B'
            ? 'border-[#d97706] bg-[#241c10]/70 shadow-[3px_3px_0px_0px_var(--shadow-color)]'
            : 'border-[var(--ink-border)] bg-[var(--subtle-bg)]'
        }`}>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="font-broadsheet font-bold text-sm text-[var(--paper-cream)] uppercase truncate">
                {nameB}
              </span>
              <span className="font-mono text-xs font-bold text-[#d97706]">
                {percentB}% ({battle.channelBVotes} votes)
              </span>
            </div>
            <p className="text-xs text-[var(--paper-muted)] font-sans italic">
              &quot;{battle.channelBRoast || `Late-night dispatches and peak telegraph drama.`}&quot;
            </p>
          </div>

          <button
            onClick={() => handleVote('B')}
            disabled={voting}
            className={`stamp-btn w-full !py-2 text-xs font-bold active:scale-95 flex items-center justify-center gap-1.5 ${
              battle.userVote === 'B'
                ? '!bg-[#d97706] !text-black !border-[#d97706]'
                : 'hover:border-[#d97706]'
            }`}
          >
            {battle.userVote === 'B' ? <Check className="w-3.5 h-3.5" /> : <Flame className="w-3.5 h-3.5 text-[#d97706]" />}
            <span>{battle.userVote === 'B' ? 'VOTED FOR CHAOS' : `VOTE FOR ${nameB.toUpperCase()}`}</span>
          </button>
        </div>
      </div>

      {/* Progress Vote Bar */}
      <div className="w-full bg-[var(--subtle-bg)] h-2 border border-[var(--ink-border)] flex overflow-hidden">
        <div
          className="bg-[#d97706] transition-all duration-500"
          style={{ width: `${percentA}%` }}
        />
        <div
          className="bg-indigo-600 transition-all duration-500"
          style={{ width: `${percentB}%` }}
        />
      </div>
    </div>
  );
}
