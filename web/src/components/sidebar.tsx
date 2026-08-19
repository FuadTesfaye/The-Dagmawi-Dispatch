'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from './providers';
import { Home, Radio, Flame, Shield, User, Bot, Sparkles } from 'lucide-react';

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
    <aside className="hidden lg:flex flex-col w-64 shrink-0 gap-6 p-4 border-r border-zinc-800/60 min-h-[calc(100vh-4rem)]">
      {/* Navigation Group */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 px-3 py-1">
          Navigation
        </span>
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-semibold transition-all duration-200 ${
                isActive
                  ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/80'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-zinc-950' : 'text-amber-400'}`} />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Featured Channel Spotlight */}
      <div className="p-4 rounded-3xl glass-panel bg-gradient-to-b from-amber-500/10 to-transparent border border-amber-500/20 flex flex-col gap-3">
        <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-4 h-4" />
          <span>Crown Channel</span>
        </div>
        <div>
          <h4 className="text-sm font-extrabold text-zinc-100">@dagmawi_babi</h4>
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
            Unfiltered tech commentary, breaking updates, and high-velocity dispatches.
          </p>
        </div>
        <Link
          href="/channel/dagmawi_babi"
          className="text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors inline-flex items-center gap-1"
        >
          View Kingdom Archives →
        </Link>
      </div>

      {/* Bot Companion Callout */}
      <div className="mt-auto p-4 rounded-3xl bg-zinc-900/60 border border-zinc-800 flex flex-col gap-3 text-xs">
        <div className="flex items-center gap-2 text-zinc-300 font-bold">
          <Bot className="w-4 h-4 text-amber-400" />
          <span>Telegram Bot</span>
        </div>
        <p className="text-zinc-400 leading-relaxed">
          Prefer Telegram notifications directly? Talk with the official Herald bot.
        </p>
        <a
          href="https://t.me/BabisummarizeBot"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-2 px-3 text-center rounded-xl bg-zinc-800 hover:bg-zinc-700 font-semibold text-zinc-200 transition-colors"
        >
          Open @BabisummarizeBot
        </a>
      </div>
    </aside>
  );
}
