'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from './providers';
import { BookOpen, Radio, UserCheck, ShieldAlert, Bot, ArrowUpRight } from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const links = [
    { href: '/', label: 'Broadsheet Feed', code: '01', icon: BookOpen },
    { href: '/channels', label: 'Channel Ledger', code: '02', icon: Radio },
    { href: '/profile', label: 'Scribe Records', code: '03', icon: UserCheck },
  ];

  if (user?.role === 'admin' || user?.role === 'moderator') {
    links.push({ href: '/admin/moderation', label: 'Court Inquest', code: '04', icon: ShieldAlert });
  }

  return (
    <aside className="hidden lg:flex flex-col w-60 shrink-0 gap-6 py-6 pr-6 border-r border-[#262936] min-h-[calc(100vh-4rem)] sticky top-16 font-teletype">
      {/* Index Menu */}
      <div className="flex flex-col gap-1.5">
        <div className="text-[10px] font-bold uppercase tracking-widest text-[#a39e93] px-2 py-1 border-b border-[#262936]">
          § Archival Index
        </div>
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center justify-between px-3 py-2.5 text-xs transition-all border ${
                isActive
                  ? 'bg-[#f4f0e6] text-[#0c0d10] font-black border-[#f4f0e6] shadow-[2px_2px_0px_0px_#262936]'
                  : 'bg-[#12141c] text-[#a39e93] border-[#262936] hover:text-[#f4f0e6] hover:border-[#3d4257]'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="opacity-60">[{link.code}]</span>
                <span className="uppercase">{link.label}</span>
              </div>
              {isActive && <span>↵</span>}
            </Link>
          );
        })}
      </div>

      {/* Featured Primary Broadcast */}
      <div className="p-3.5 bg-[#141620] border-2 border-[#262936] shadow-[3px_3px_0px_0px_#0c0d10] flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-bold uppercase tracking-wider text-[#d97706]">
            ✦ CROWN DISPATCH
          </span>
          <span className="text-[9px] text-[#a39e93]">VERIFIED</span>
        </div>
        <div>
          <h4 className="text-xs font-bold text-[#f4f0e6]">@dagmawi_babi</h4>
          <p className="text-[10px] text-[#a39e93] mt-1 leading-relaxed">
            Primary high-frequency technical transmissions and court decrees.
          </p>
        </div>
        <Link
          href="/channel/dagmawi_babi"
          className="text-[10px] font-bold text-[#f4f0e6] hover:underline inline-flex items-center gap-1 mt-1"
        >
          <span>EXAMINE ARCHIVE</span>
          <ArrowUpRight className="w-3 h-3 text-[#d97706]" />
        </Link>
      </div>

      {/* Companion Bot */}
      <div className="mt-auto p-3.5 bg-[#12141c] border border-[#262936] flex flex-col gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-[#f4f0e6] font-bold text-[11px]">
          <Bot className="w-3.5 h-3.5 text-[#d97706]" />
          <span>TELEGRAM BOT COMPANION</span>
        </div>
        <p className="text-[10px] text-[#a39e93] leading-relaxed">
          Daily digests relayed instantly to your personal chat.
        </p>
        <a
          href="https://t.me/BabisummarizeBot"
          target="_blank"
          rel="noopener noreferrer"
          className="stamp-btn text-center !text-[10px] !py-2"
        >
          SUMMON @BabisummarizeBot
        </a>
      </div>
    </aside>
  );
}
