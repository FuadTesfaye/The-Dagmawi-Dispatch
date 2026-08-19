'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Radio, User, Shield } from 'lucide-react';
import { useAuth } from './providers';

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  const links = [
    { href: '/', label: 'Feed', icon: Home },
    { href: '/channels', label: 'Channels', icon: Radio },
    { href: '/profile', label: 'Profile', icon: User },
  ];

  if (user?.role === 'admin' || user?.role === 'moderator') {
    links.push({ href: '/admin/moderation', label: 'Court', icon: Shield });
  }

  return (
    <nav className="lg:hidden fixed bottom-3 left-4 right-4 z-40 glass-card bg-zinc-950/90 backdrop-blur-2xl border border-zinc-800/80 rounded-3xl p-2 flex items-center justify-around shadow-2xl">
      {links.map((link) => {
        const Icon = link.icon;
        const isActive = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex flex-col items-center gap-1 py-1.5 px-4 rounded-2xl text-[11px] font-extrabold transition-all duration-200 ${
              isActive
                ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/25 scale-105 font-black'
                : 'text-zinc-400 hover:text-zinc-100'
            }`}
          >
            <Icon className={`w-4 h-4 ${isActive ? 'text-zinc-950' : 'text-zinc-400'}`} />
            <span>{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
