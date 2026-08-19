'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from './providers';
import { Newspaper, Radio, UserCheck, ShieldAlert, Bot, ArrowUpRight } from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const links = [
    { href: '/', label: 'Dispatches', icon: Newspaper },
    { href: '/channels', label: 'Channels', icon: Radio },
    { href: '/profile', label: 'Subscriptions', icon: UserCheck },
  ];

  if (user?.role === 'admin' || user?.role === 'moderator') {
    links.push({ href: '/admin/moderation', label: 'Moderation', icon: ShieldAlert });
  }

  return (
    <aside className="hidden lg:flex flex-col w-56 shrink-0 gap-6 py-6 pr-6 border-r border-white/[0.06] min-h-[calc(100vh-3.5rem)] sticky top-14">
      {/* Navigation */}
      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 px-3 py-1">
          Navigation
        </span>
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-zinc-800/90 text-white font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-zinc-400'}`} />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Featured Channel Card */}
      <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-white/[0.06] flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            Primary Feed
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-zinc-200">@dagmawi_babi</h4>
          <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
            Tech analysis, software releases, and unfiltered commentary.
          </p>
        </div>
        <Link
          href="/channel/dagmawi_babi"
          className="text-[11px] font-semibold text-zinc-300 hover:text-white inline-flex items-center gap-1 mt-1 transition-colors"
        >
          <span>View Archive</span>
          <ArrowUpRight className="w-3 h-3 text-zinc-500" />
        </Link>
      </div>

      {/* Companion Bot */}
      <div className="mt-auto p-3.5 rounded-xl bg-zinc-900/40 border border-white/[0.06] flex flex-col gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
          <Bot className="w-3.5 h-3.5 text-zinc-400" />
          <span>Telegram Bot</span>
        </div>
        <p className="text-[11px] text-zinc-400 leading-relaxed">
          Receive automatic summaries in your Telegram chat.
        </p>
        <a
          href="https://t.me/BabisummarizeBot"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-1.5 px-2.5 text-center rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-200 transition-colors"
        >
          Open @BabisummarizeBot
        </a>
      </div>
    </aside>
  );
}
