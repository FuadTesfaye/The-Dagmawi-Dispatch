'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from './providers';
import { Home, Radio, Shield, User, Bot, Sparkles, Flame, ChevronRight } from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const links = [
    { href: '/', label: 'Feed & Scrolls', icon: Home },
    { href: '/channels', label: 'Channel Directory', icon: Radio },
    { href: '/profile', label: 'My Subscriptions', icon: User },
  ];

  if (user?.role === 'admin' || user?.role === 'moderator') {
    links.push({ href: '/admin/moderation', label: 'Moderation Court', icon: Shield });
  }

  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 gap-6 p-4 border-r border-zinc-800/60 min-h-[calc(100vh-4rem)] sticky top-16">
      {/* Navigation Group */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-extrabold uppercase tracking-widest text-zinc-500 px-3 py-1">
          Kingdom Menu
        </span>
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-zinc-950 shadow-md shadow-amber-500/25 font-black scale-[1.02]'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/80 border border-transparent hover:border-zinc-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-zinc-950' : 'text-amber-400'}`} />
                <span>{link.label}</span>
              </div>
              {isActive && <ChevronRight className="w-4 h-4 text-zinc-950" />}
            </Link>
          );
        })}
      </div>

      {/* Featured Channel Spotlight */}
      <div className="p-4 rounded-3xl glass-card bg-gradient-to-b from-amber-500/15 via-zinc-950/60 to-zinc-950 border border-amber-500/30 flex flex-col gap-3 shadow-xl">
        <div className="flex items-center gap-2 text-amber-400 text-xs font-extrabold uppercase tracking-wider">
          <Sparkles className="w-4 h-4" />
          <span>Crown Channel</span>
        </div>
        <div>
          <h4 className="text-sm font-black text-zinc-100">@dagmawi_babi</h4>
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
            High-frequency tech dispatches, unfiltered opinions, and daily updates.
          </p>
        </div>
        <Link
          href="/channel/dagmawi_babi"
          className="text-xs font-extrabold text-amber-400 hover:text-amber-300 transition-colors inline-flex items-center gap-1 mt-1"
        >
          View Kingdom Archives →
        </Link>
      </div>

      {/* Bot Companion Callout */}
      <div className="mt-auto p-4 rounded-3xl glass-card bg-zinc-950/80 border border-zinc-800 flex flex-col gap-3 text-xs">
        <div className="flex items-center gap-2 text-zinc-200 font-extrabold">
          <Bot className="w-4 h-4 text-amber-400" />
          <span>Telegram Bot Companion</span>
        </div>
        <p className="text-zinc-400 leading-relaxed text-[11px]">
          Want daily digests delivered straight to your Telegram DM?
        </p>
        <a
          href="https://t.me/BabisummarizeBot"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-2.5 px-3 text-center rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 font-bold text-zinc-100 transition-all shadow-sm"
        >
          Summon @BabisummarizeBot
        </a>
      </div>
    </aside>
  );
}
