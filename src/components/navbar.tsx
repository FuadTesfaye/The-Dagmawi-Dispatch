'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth, useTheme } from './providers';
import {
  LogOut,
  Shield,
  Menu,
  X,
  Radio,
  BookOpen,
  User,
  Bot,
  ArrowUpRight,
  Search,
  Sun,
  Moon,
  Smartphone,
  Compass,
  BarChart3,
} from 'lucide-react';
import { SearchModal } from './search-modal';
import { TELEGRAM_BOT_USERNAME } from '@/lib/constants';

export function Navbar() {
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  const botUsername = TELEGRAM_BOT_USERNAME;

  // Global shortcut: Cmd+K, Ctrl+K, or / to open search & Escape to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchModalOpen((prev) => !prev);
      } else if (
        e.key === '/' &&
        !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)
      ) {
        e.preventDefault();
        setIsSearchModalOpen(true);
      } else if (e.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close mobile menu automatically on route change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  const navLinks = [
    { label: 'Dispatches', href: '/', icon: BookOpen },
    { label: 'Channels', href: '/channels', icon: Radio },
    { label: 'Roadmap', href: '/roadmap', icon: Compass },
    { label: 'Mobile App', href: '/app', icon: Smartphone },
  ];

  if (user?.role === 'admin' || user?.role === 'moderator') {
    navLinks.push({ label: 'Court', href: '/admin/moderation', icon: Shield });
  }

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-[var(--header-bg)]/95 backdrop-blur-xl border-b border-[var(--ink-border)] font-teletype shadow-sm transition-colors pt-[env(safe-area-inset-top,0px)] pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)]">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-3">
          {/* Left: Clean Brand Logo */}
          <div className="flex items-center gap-6 min-w-0">
            <Link href="/" className="flex items-center gap-2.5 group shrink-0" aria-label="The Lurkening Home">
              <div className="w-8 h-8 border border-[var(--ink-border-heavy)] bg-[var(--paper-cream)] text-[var(--ink-bg)] flex items-center justify-center font-black font-broadsheet text-base shadow-[2px_2px_0px_0px_var(--shadow-color)] transition-transform group-active:scale-95 shrink-0">
                §
              </div>
              <span className="font-broadsheet font-black text-sm sm:text-lg tracking-tight text-[var(--paper-cream)] uppercase group-hover:text-[#d97706] transition-colors truncate">
                The Lurkening
              </span>
            </Link>

            {/* Desktop Clean Navigation Links (Clean text pills without heavy clutter) */}
            <nav className="hidden md:flex items-center gap-1 font-teletype text-xs">
              {navLinks.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-1.5 transition-colors uppercase font-bold text-xs rounded-sm active:scale-95 flex items-center gap-1.5 ${
                      isActive
                        ? 'text-[#d97706] bg-[var(--subtle-bg)] border border-[var(--ink-border)]'
                        : 'text-[var(--paper-muted)] hover:text-[var(--paper-cream)] hover:bg-[var(--subtle-bg)]/60'
                    }`}
                  >
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Toolbar: Clean Minimalist Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Universal Search Action */}
            <button
              onClick={() => setIsSearchModalOpen(true)}
              className="p-2 sm:px-3 sm:py-1.5 border border-[var(--ink-border)] bg-[var(--subtle-bg)] text-xs text-[var(--paper-muted)] hover:text-[var(--paper-cream)] hover:border-[#d97706] flex items-center gap-2 transition-all rounded-sm active:scale-95"
              title="Search Archives (Cmd+K)"
              aria-label="Search Archives"
            >
              <Search className="w-3.5 h-3.5 text-[#d97706]" />
              <span className="hidden sm:inline font-bold">Search</span>
              <kbd className="hidden lg:inline px-1 bg-[var(--input-bg)] border border-[var(--ink-border)] text-[9px] text-[var(--paper-muted)] rounded">
                ⌘K
              </kbd>
            </button>

            {/* Theme Switcher Toggle */}
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to Broadsheet Light' : 'Switch to Dark Ink'}
              className="p-2 border border-[var(--ink-border)] bg-[var(--subtle-bg)] text-[var(--paper-muted)] hover:text-[var(--paper-cream)] hover:border-[#d97706] transition-all rounded-sm active:scale-95"
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-indigo-500" />
              )}
            </button>

            {/* User Profile / Auth */}
            {loading ? (
              <div className="w-8 h-8 bg-zinc-800 animate-pulse border border-zinc-700 rounded-sm" />
            ) : user ? (
              <div className="flex items-center gap-1.5">
                <Link
                  href="/profile"
                  className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1 bg-[var(--subtle-bg)] border border-[var(--ink-border)] hover:border-[#d97706] transition-all rounded-sm active:scale-95"
                  aria-label="User Profile"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={user.photoUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.displayName}`}
                    alt={user.displayName}
                    className="w-5 h-5 rounded-full object-cover bg-zinc-800 shrink-0"
                  />
                  <span className="font-teletype text-xs font-semibold text-[var(--paper-cream)] hidden sm:inline max-w-[100px] truncate">
                    {user.displayName}
                  </span>
                </Link>

                <button
                  onClick={logout}
                  title="Sign Out"
                  className="p-2 border border-[var(--ink-border)] text-[var(--paper-muted)] hover:text-rose-500 hover:border-rose-500 transition-colors hidden sm:inline-flex rounded-sm active:scale-95"
                  aria-label="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="stamp-btn !py-1.5 !px-3 text-xs font-bold active:scale-95"
              >
                Sign In
              </Link>
            )}

            {/* Mobile Hamburger Trigger */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 border border-[var(--ink-border)] bg-[var(--subtle-bg)] text-[var(--paper-cream)] hover:border-[#d97706] active:scale-95 rounded-sm"
              aria-label="Toggle navigation menu"
            >
              {isMenuOpen ? <X className="w-4 h-4 text-[#d97706]" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer (Clean & organized) */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-[var(--ink-border)] bg-[var(--card-bg)] p-4 flex flex-col gap-2 font-teletype text-xs shadow-2xl animate-in slide-in-from-top-2 duration-150">
            {navLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMenuOpen(false)}
                className={`p-3 border rounded-sm transition-colors flex items-center justify-between ${
                  pathname === item.href
                    ? 'bg-[var(--paper-cream)] text-[var(--ink-bg)] border-[var(--paper-cream)] font-bold'
                    : 'text-[var(--paper-cream)] border-[var(--ink-border)] bg-[var(--subtle-bg)]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <item.icon className="w-4 h-4 text-[#d97706]" />
                  <span className="font-bold uppercase">{item.label}</span>
                </div>
                <span className="text-[10px] text-[var(--paper-muted)]">→</span>
              </Link>
            ))}

            {/* Creator Report Card Link */}
            <Link
              href="/creator"
              onClick={() => setIsMenuOpen(false)}
              className={`p-3 border rounded-sm transition-colors flex items-center justify-between ${
                pathname === '/creator'
                  ? 'bg-[var(--paper-cream)] text-[var(--ink-bg)] border-[var(--paper-cream)] font-bold'
                  : 'text-[var(--paper-cream)] border-[var(--ink-border)] bg-[var(--subtle-bg)]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <BarChart3 className="w-4 h-4 text-[#d97706]" />
                <span className="font-bold uppercase">Creator Report Card</span>
              </div>
              <span className="text-[10px] text-[var(--paper-muted)]">→</span>
            </Link>

            {/* Telegram Bot Action */}
            <a
              href={`https://t.me/${botUsername}`}
              target="_blank"
              rel="noopener noreferrer"
              suppressHydrationWarning
              className="p-3 border border-[#785a28] bg-[#241c10] text-[#f6d89b] rounded-sm flex items-center justify-between transition-colors font-bold uppercase mt-1"
            >
              <div className="flex items-center gap-2" suppressHydrationWarning>
                <Bot className="w-4 h-4 text-[#d97706]" />
                <span suppressHydrationWarning>@{botUsername}</span>
              </div>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>

            {/* Sign out */}
            {user && (
              <button
                onClick={() => {
                  logout();
                  setIsMenuOpen(false);
                }}
                className="p-2.5 border border-rose-900/60 bg-rose-950/20 text-rose-400 rounded-sm flex items-center justify-center gap-2 font-bold uppercase transition-colors mt-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out ({user.displayName})</span>
              </button>
            )}
          </div>
        )}
      </header>

      {/* Global Search Modal */}
      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
      />
    </>
  );
}
