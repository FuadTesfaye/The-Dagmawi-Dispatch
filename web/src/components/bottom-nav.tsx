'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Newspaper, Radio, UserCheck, ShieldAlert } from 'lucide-react';
import { useAuth } from './providers';

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  const links = [
    { href: '/', label: 'Feed', icon: Newspaper },
    { href: '/channels', label: 'Channels', icon: Radio },
    { href: '/profile', label: 'Profile', icon: UserCheck },
  ];

  if (user?.role === 'admin' || user?.role === 'moderator') {
    links.push({ href: '/admin/moderation', label: 'Admin', icon: ShieldAlert });
  }

  return (
    <nav className="lg:hidden fixed bottom-3 left-4 right-4 z-40 bg-zinc-950/90 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-1.5 flex items-center justify-around shadow-2xl">
      {links.map((link) => {
        const Icon = link.icon;
        const isActive = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex flex-col items-center gap-1 py-1.5 px-4 rounded-xl text-[11px] font-medium transition-colors ${
              isActive
                ? 'bg-zinc-800 text-white font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
