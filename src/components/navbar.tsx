'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth, useRealtime, useTheme } from './providers';
import { useAppUpdate } from './app-update-prompt';
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
  Sparkles,
  Download,
  CheckCircle2,
} from 'lucide-react';
import { SearchModal } from './search-modal';
import { TELEGRAM_BOT_USERNAME } from '@/lib/constants';

export function Navbar() {
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();
  const { isConnected } = useRealtime();
  const { theme, toggleTheme } = useTheme();
  const { isUpdateAvailable, updateInfo, applyUpdate } = useAppUpdate();
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
    {
      label: 'Mobile App',
      href: '/app',
      icon: Smartphone,
      hasBadge: isUpdateAvailable,
      badgeText: 'UPDATE',
    },
    { label: 'Profile', href: '/profile', icon: User },
  ];

  if (user?.role === 'admin' || user?.role === 'moderator') {
    navLinks.push({ label: 'Court Inquest', href: '/admin/moderation', icon: Shield });
  }

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-[var(--header-bg)]/95 backdrop-blur-xl border-b-2 border-[var(--ink-border)] font-teletype shadow-md transition-colors pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)]">
        <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 h-13 sm:h-16 flex items-center justify-between gap-1.5 sm:gap-4">
          {/* Left: Brand / Masthead */}
          <div className="flex items-center gap-2 sm:gap-5 min-w-0">
            <Link href="/" className="flex items-center gap-2 sm:gap-3 group shrink-0" aria-label="The Lurkening Home">
              <div className="w-7 h-7 sm:w-9 sm:h-9 border-2 border-[var(--ink-border-heavy)] bg-[var(--paper-cream)] text-[var(--ink-bg)] flex items-center justify-center font-black font-broadsheet text-sm sm:text-lg shadow-[2px_2px_0px_0px_var(--shadow-color)] transition-transform group-active:scale-95 shrink-0">
                §
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-broadsheet font-black text-xs xs:text-sm sm:text-lg tracking-tight text-[var(--paper-cream)] uppercase group-hover:text-[#d97706] transition-colors truncate">
                  The Lurkening
                </span>
                <span className="font-teletype text-[7px] sm:text-[9px] tracking-widest text-[var(--paper-muted)] uppercase hidden sm:inline">
                  Gazette & Teleprinter
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1.5 font-teletype text-xs">
              {navLinks.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`relative px-2.5 lg:px-3 py-1.5 border transition-all uppercase font-bold text-[11px] lg:text-xs active:scale-95 flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-[var(--paper-cream)] text-[var(--ink-bg)] border-[var(--paper-cream)] shadow-[2px_2px_0px_0px_var(--shadow-color)]'
                        : 'bg-[var(--card-bg)] text-[var(--paper-muted)] border-[var(--ink-border)] hover:border-[var(--paper-cream)] hover:text-[var(--paper-cream)]'
                    }`}
                  >
                    <item.icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                    {item.hasBadge && (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right: Theme Switcher, Status, Universal Search & Mobile Hamburger */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Quick App Update Indicator Button (when update is available) */}
            {isUpdateAvailable && (
              <button
                onClick={applyUpdate}
                title={`Update available: ${updateInfo?.version || '1.0.1'}`}
                className="hidden sm:inline-flex items-center gap-1 px-2 py-1 bg-amber-950/70 border border-amber-500/70 text-amber-300 text-[10px] font-bold hover:bg-amber-900 transition-all active:scale-95 animate-pulse"
              >
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span className="hidden lg:inline">NEW EDITION</span>
                <span>v{updateInfo?.version || '1.0.1'}</span>
              </button>
            )}

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to Broadsheet Light Mode' : 'Switch to Ink Dark Mode'}
              className="stamp-btn !py-1.5 !px-2 sm:!px-2.5 text-xs flex items-center gap-1 active:scale-95 hover:border-[#d97706]"
              aria-label="Toggle Light or Dark Theme"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden xl:inline text-[10px]">LIGHT</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-indigo-700" />
                  <span className="hidden xl:inline text-[10px]">DARK</span>
                </>
              )}
            </button>

            {/* Universal Search Button */}
            <button
              onClick={() => setIsSearchModalOpen(true)}
              className="stamp-btn !py-1.5 !px-2 sm:!px-3 text-xs flex items-center gap-1.5 hover:border-[#d97706] active:scale-95"
              title="Search Archives (Cmd+K or /)"
              aria-label="Search Archives"
            >
              <Search className="w-3.5 h-3.5 text-[#d97706]" />
              <span className="hidden sm:inline font-bold">SEARCH</span>
              <kbd className="hidden lg:inline px-1 bg-[var(--subtle-bg)] border border-[var(--ink-border)] text-[9px] text-[var(--paper-muted)]">
                ⌘K
              </kbd>
            </button>

            {/* Live Wire Status Badge (Desktop) */}
            <div className="hidden xl:flex items-center gap-1.5 font-teletype text-[10px] px-2.5 py-1 bg-[var(--subtle-bg)] border border-[var(--ink-border)] text-[var(--paper-muted)]">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span>{isConnected ? 'LIVE WIRE' : 'POLLING'}</span>
            </div>

            {/* Bot Callout (Desktop) */}
            <a
              href={`https://t.me/${botUsername}`}
              target="_blank"
              rel="noopener noreferrer"
              suppressHydrationWarning
              className="hidden lg:inline-flex items-center gap-1.5 stamp-btn !bg-[#241c10] !border-[#785a28] !text-[#f6d89b] hover:!bg-[#d97706] hover:!text-black !py-1.5 !px-3"
            >
              <Bot className="w-3.5 h-3.5 text-[#d97706]" />
              <span suppressHydrationWarning>@{botUsername}</span>
              <ArrowUpRight className="w-3 h-3 opacity-70" />
            </a>

            {/* User Profile Section (Desktop / Tablet) */}
            {loading ? (
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-zinc-800 animate-pulse border border-zinc-700" />
            ) : user ? (
              <div className="flex items-center gap-1.5">
                <Link
                  href="/profile"
                  className="flex items-center gap-1.5 sm:gap-2 px-2 py-1 sm:py-1.5 bg-[var(--subtle-bg)] border border-[var(--ink-border)] hover:border-[var(--paper-cream)] transition-all active:scale-95"
                  aria-label="User Profile"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={user.photoUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.displayName}`}
                    alt={user.displayName}
                    className="w-4 h-4 sm:w-5 sm:h-5 bg-zinc-800 object-cover shrink-0"
                  />
                  <span className="font-teletype text-xs font-semibold text-[var(--paper-cream)] hidden sm:inline max-w-[90px] lg:max-w-[120px] truncate">
                    {user.displayName}
                  </span>
                </Link>

                <button
                  onClick={logout}
                  title="Sign Out"
                  className="p-1.5 border border-[var(--ink-border)] text-[var(--paper-muted)] hover:text-rose-600 hover:border-rose-500 hover:bg-[var(--subtle-bg)] transition-colors hidden sm:inline-flex active:scale-95"
                  aria-label="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="stamp-btn !py-1 !px-2 sm:!py-1.5 sm:!px-3 text-xs font-bold active:scale-95"
              >
                Sign In
              </Link>
            )}

            {/* Mobile Hamburger Drawer Trigger */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 border border-[var(--ink-border)] text-[var(--paper-cream)] hover:bg-[var(--subtle-bg)] active:scale-95 flex items-center justify-center"
              aria-label="Toggle navigation menu"
            >
              {isMenuOpen ? <X className="w-4 h-4 text-[#d97706]" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer with Royal Styling */}
        {isMenuOpen && (
          <div className="md:hidden border-t-2 border-[var(--ink-border)] bg-[var(--card-bg)] p-3.5 sm:p-4 flex flex-col gap-2.5 font-teletype text-xs shadow-2xl animate-in slide-in-from-top-2 duration-150 max-h-[85vh] overflow-y-auto">
            {/* Live connection state & update banner */}
            <div className="flex items-center justify-between px-3 py-2 bg-[var(--subtle-bg)] border border-[var(--ink-border)] text-[10px]">
              <span className="text-[var(--paper-muted)]">TELETYPE WIRE STATUS</span>
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                <span className="font-bold text-[var(--paper-cream)]">{isConnected ? 'ONLINE' : 'POLLING'}</span>
              </div>
            </div>

            {/* Mobile Update Banner (if update ready) */}
            {isUpdateAvailable && (
              <div className="p-3 bg-amber-950/40 border border-amber-500/60 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-[11px] text-amber-200 font-bold">
                    Edition {updateInfo?.version || '1.0.1'} Ready
                  </span>
                </div>
                <button
                  onClick={() => {
                    applyUpdate();
                    setIsMenuOpen(false);
                  }}
                  className="px-2.5 py-1 bg-amber-500 text-black text-[10px] font-bold uppercase active:scale-95 shrink-0"
                >
                  Update
                </button>
              </div>
            )}

            {/* Nav links */}
            <div className="flex flex-col gap-1.5">
              {navLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={`p-2.5 sm:p-3 border transition-colors flex items-center justify-between ${
                    pathname === item.href
                      ? 'bg-[var(--paper-cream)] text-[var(--ink-bg)] border-[var(--paper-cream)] font-bold shadow-[2px_2px_0px_0px_var(--shadow-color)]'
                      : 'text-[var(--paper-cream)] border-[var(--ink-border)] hover:bg-[var(--subtle-bg)]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <item.icon className="w-4 h-4 text-[#d97706]" />
                    <span className="font-bold uppercase tracking-wider">{item.label}</span>
                    {item.hasBadge && (
                      <span className="stamp-badge stamp-badge-gold text-[9px] py-0 px-1.5">NEW</span>
                    )}
                  </div>
                  <span className="text-[10px] text-[var(--paper-muted)]">→</span>
                </Link>
              ))}
            </div>

            {/* Quick Android APK Download Link */}
            <Link
              href="/app"
              onClick={() => setIsMenuOpen(false)}
              className="p-2.5 border border-[#d97706]/60 bg-[#241c10] text-[#f6d89b] hover:bg-[#d97706] hover:text-black flex items-center justify-between transition-colors font-bold uppercase"
            >
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4 text-[#d97706]" />
                <span>DOWNLOAD ANDROID APK</span>
              </div>
              <span className="text-[10px] font-mono">v1.0.1</span>
            </Link>

            {/* Telegram Bot Action */}
            <a
              href={`https://t.me/${botUsername}`}
              target="_blank"
              rel="noopener noreferrer"
              suppressHydrationWarning
              className="p-2.5 border border-[#785a28] bg-[var(--subtle-bg)] text-[var(--paper-cream)] hover:bg-[var(--paper-cream)] hover:text-[var(--ink-bg)] flex items-center justify-between transition-colors font-bold uppercase"
            >
              <div className="flex items-center gap-2" suppressHydrationWarning>
                <Bot className="w-4 h-4 text-[#d97706]" />
                <span suppressHydrationWarning>SUMMON @{botUsername}</span>
              </div>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>

            {/* Theme Switcher */}
            <button
              onClick={toggleTheme}
              className="p-2.5 border border-[var(--ink-border)] bg-[var(--subtle-bg)] flex items-center justify-between text-[var(--paper-cream)] font-bold uppercase"
            >
              <div className="flex items-center gap-2">
                {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
                <span>APPEARANCE: {theme === 'dark' ? 'LIGHT MODE' : 'DARK MODE'}</span>
              </div>
              <span className="text-[10px] text-[#d97706]">[ TOGGLE ]</span>
            </button>

            {/* Sign out if logged in */}
            {user && (
              <button
                onClick={() => {
                  logout();
                  setIsMenuOpen(false);
                }}
                className="p-2.5 border border-rose-900/60 bg-rose-950/20 text-rose-400 hover:bg-rose-900/40 flex items-center justify-center gap-2 font-bold uppercase transition-colors"
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
