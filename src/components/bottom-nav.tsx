'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Radio, User, ShieldAlert, Search, Smartphone } from 'lucide-react';
import { useAuth } from './providers';
import { useAppUpdate } from './app-update-prompt';
import { SearchModal } from './search-modal';

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { isUpdateAvailable } = useAppUpdate();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const links = [
    { href: '/', label: 'FEED', icon: BookOpen },
    { href: '/channels', label: 'CHANNELS', icon: Radio },
    {
      href: '/app',
      label: 'APP',
      icon: Smartphone,
      hasBadge: isUpdateAvailable,
    },
  ];

  if (user?.role === 'admin' || user?.role === 'moderator') {
    links.push({ href: '/admin/moderation', label: 'COURT', icon: ShieldAlert });
  }

  links.push({ href: '/profile', label: 'SCRIBE', icon: User });

  return (
    <>
      <nav
        aria-label="Mobile Navigation Dock"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--header-bg)]/95 backdrop-blur-2xl border-t-2 border-[var(--ink-border)] px-2 sm:px-4 pt-1.5 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] flex items-center justify-around font-teletype shadow-[0_-8px_24px_var(--shadow-color)] pl-[max(0.5rem,env(safe-area-inset-left,0px))] pr-[max(0.5rem,env(safe-area-inset-right,0px))]"
      >
        {/* Main Links */}
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`relative flex-1 flex flex-col items-center justify-center py-1 px-1 text-[9px] xs:text-[10px] font-bold transition-all rounded-sm active:scale-90 ${
                isActive
                  ? 'bg-[var(--paper-cream)] text-[var(--ink-bg)] shadow-[2px_2px_0px_0px_var(--shadow-color)]'
                  : 'text-[var(--paper-muted)] hover:text-[var(--paper-cream)]'
              }`}
            >
              {link.href === '/profile' && user?.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.photoUrl}
                  alt={user.displayName}
                  className={`w-4 h-4 rounded-full object-cover mb-0.5 border ${
                    isActive ? 'border-black' : 'border-[#d97706]'
                  }`}
                />
              ) : (
                <div className="relative">
                  <Icon className={`w-4 h-4 mb-0.5 ${isActive ? 'text-[var(--ink-bg)]' : ''}`} />
                  {link.hasBadge && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-500 animate-pulse ring-2 ring-black" />
                  )}
                </div>
              )}
              <span className="tracking-wider truncate max-w-[50px] text-center">{link.label}</span>
            </Link>
          );
        })}

        {/* Dedicated Search Action */}
        <button
          onClick={() => setIsSearchOpen(true)}
          className="flex-1 flex flex-col items-center justify-center py-1 px-1 text-[9px] xs:text-[10px] font-bold text-[#d97706] hover:text-[#f4f0e6] transition-all rounded-sm active:scale-90"
          aria-label="Open Search Modal"
        >
          <Search className="w-4 h-4 mb-0.5" />
          <span className="tracking-wider">SEARCH</span>
        </button>
      </nav>

      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}
