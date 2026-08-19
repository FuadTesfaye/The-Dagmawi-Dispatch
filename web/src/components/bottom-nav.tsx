'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Radio, UserCheck, ShieldAlert } from 'lucide-react';
import { useAuth } from './providers';

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  const links = [
    { href: '/', label: 'FEED', icon: BookOpen },
    { href: '/channels', label: 'CHANNELS', icon: Radio },
    { href: '/profile', label: 'SCRIBE', icon: UserCheck },
  ];

  if (user?.role === 'admin' || user?.role === 'moderator') {
    links.push({ href: '/admin/moderation', label: 'COURT', icon: ShieldAlert });
  }

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#12141c] border-t-2 border-[#262936] p-2 flex items-center justify-around font-teletype">
      {links.map((link) => {
        const Icon = link.icon;
        const isActive = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex flex-col items-center gap-1 py-1 px-3 text-[10px] font-bold border transition-colors ${
              isActive
                ? 'bg-[#f4f0e6] text-[#0c0d10] border-[#f4f0e6]'
                : 'text-[#a39e93] border-transparent hover:text-[#f4f0e6]'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
