'use client';

import React from 'react';
import { Tag, Sparkles, Flame, Cpu, DollarSign, Newspaper, Laugh, Compass } from 'lucide-react';

interface FeedTagFilterProps {
  activeTag: string;
  onSelectTag: (tag: string) => void;
}

const TAGS = [
  { id: 'all', label: 'ALL DISPATCHES' },
  { id: 'tech', label: 'TECH' },
  { id: 'dev_tools', label: 'DEV TOOLS' },
  { id: 'ai_ml', label: 'AI / ML' },
  { id: 'crypto', label: 'CRYPTO' },
  { id: 'finance', label: 'FINANCE' },
  { id: 'news', label: 'NEWS' },
  { id: 'humor', label: 'HUMOR' },
  { id: 'culture', label: 'CULTURE' },
];

export function FeedTagFilter({ activeTag, onSelectTag }: FeedTagFilterProps) {
  return (
    <div className="w-full overflow-x-auto no-scrollbar py-1">
      <div className="flex items-center gap-1.5 min-w-max font-teletype text-[10px] sm:text-xs">
        <span className="text-[var(--paper-muted)] uppercase font-bold text-[9px] mr-1 hidden sm:inline">
          TOPICS:
        </span>
        {TAGS.map((t) => {
          const isActive = activeTag === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onSelectTag(t.id)}
              className={`px-2.5 py-1 border transition-all uppercase font-bold tracking-wider rounded-sm active:scale-95 flex items-center gap-1 ${
                isActive
                  ? 'bg-[var(--paper-cream)] text-[var(--ink-bg)] border-[var(--paper-cream)] shadow-[2px_2px_0px_0px_var(--shadow-color)]'
                  : 'bg-[var(--subtle-bg)] text-[var(--paper-muted)] border-[var(--ink-border)] hover:border-[var(--paper-cream)] hover:text-[var(--paper-cream)]'
              }`}
            >
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
