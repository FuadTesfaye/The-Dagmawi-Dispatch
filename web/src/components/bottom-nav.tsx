'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Radio, User, ShieldAlert, Search } from 'lucide-react';
import { useAuth } from './providers';
import { SearchModal } from './search-modal';

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const links = [
    { href: '/', label: 'FEED', icon: BookOpen },
    { href: '/channels', label: 'CHANNELS', icon: Radio },
  ];

  if (user?.role === 'admin' || user?.role === 'moderator') {
    links.push({ href: '/admin/moderation', label: 'COURT', icon: ShieldAlert });
  }

  links.push({ href: '/profile', label: 'SCRIBE', icon: User });

  return (
    <>
      <nav
        aria-label="Mobile Navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--header-bg)]/95 backdrop-blur-xl border-t-2 border-[var(--ink-border)] px-3 pt-2 pb-[max(0.6rem,env(safe-area-inset-bottom))] flex items-center justify-around font-teletype shadow-[0_-8px_20px_var(--shadow-color)]"
      >
        {/* Main Links */}
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex-1 flex flex-col items-center justify-center py-1 px-1 text-[10px] font-bold transition-all rounded-sm active:scale-90 ${
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
                <Icon className={`w-4 h-4 mb-0.5 ${isActive ? 'text-[var(--ink-bg)]' : ''}`} />
              )}
              <span className="tracking-wider">{link.label}</span>
            </Link>
          );
        })}

        {/* Dedicated Search Action */}
        <button
          onClick={() => setIsSearchOpen(true)}
          className="flex-1 flex flex-col items-center justify-center py-1 px-1 text-[10px] font-bold text-[#d97706] hover:text-[#f4f0e6] transition-all rounded-sm active:scale-90"
        >
          <Search className="w-4 h-4 mb-0.5" />
          <span className="tracking-wider">SEARCH</span>
        </button>
      </nav>

      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}
