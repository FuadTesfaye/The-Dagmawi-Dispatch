'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Radio, UserCheck, ShieldAlert, Bot, ArrowUpRight } from 'lucide-react';
import { useAuth } from './providers';

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'lurkening_bot';

  const navItems = [
    {
      label: '[01] BROADSHEET FEED',
      href: '/',
      icon: BookOpen,
      desc: 'Real-time Telegram dispatches',
    },
    {
      label: '[02] CHANNEL LEDGER',
      href: '/channels',
      icon: Radio,
      desc: 'Monitored publication registry',
    },
    {
      label: '[03] SCRIBE RECORDS',
      href: '/profile',
      icon: UserCheck,
      desc: 'Subscriptions & profile',
    },
  ];

  if (user?.role === 'admin' || user?.role === 'moderator') {
    navItems.push({
      label: '[04] COURT INQUEST',
      href: '/admin/moderation',
      icon: ShieldAlert,
      desc: 'Judicial moderation ledger',
    });
  }

  return (
    <div className="flex flex-col gap-6 font-teletype">
      {/* Navigation Index */}
      <div className="flex flex-col gap-1 border-y border-[#262936] py-3">
        <div className="text-[10px] text-[#a39e93] uppercase font-bold tracking-widest px-2 mb-1">
          § ARCHIVAL SECTIONS
        </div>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`p-2.5 border transition-all text-left flex flex-col gap-0.5 ${
                isActive
                  ? 'bg-[#f4f0e6] text-[#0c0d10] border-[#f4f0e6] shadow-[2px_2px_0px_0px_#000000]'
                  : 'bg-[#12141c] text-[#a39e93] border-[#262936] hover:border-[#f4f0e6] hover:text-[#f4f0e6]'
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="font-bold text-xs uppercase">{item.label}</span>
              </div>
              <span className={`text-[10px] ${isActive ? 'text-[#3d4257]' : 'text-[#6b665c]'}`}>
                {item.desc}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Lurklord Bot Callout */}
      <div className="broadsheet-card p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-[#262936] pb-2">
          <span className="text-[10px] font-bold text-[#d97706] uppercase">
            ✦ TELEGRAM BOT
          </span>
          <Bot className="w-3.5 h-3.5 text-[#d97706]" />
        </div>
        <p className="text-xs text-[#a39e93] font-sans leading-relaxed">
          Monitor any channel, query daily digests, and command roasts directly via @{botUsername}.
        </p>
        <a
          href={`https://t.me/${botUsername}`}
          target="_blank"
          rel="noopener noreferrer"
          className="stamp-btn flex items-center justify-between text-xs"
        >
          <span>@{botUsername}</span>
          <ArrowUpRight className="w-3 h-3 text-[#d97706]" />
        </a>
      </div>
    </div>
  );
}
