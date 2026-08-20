'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth, useRealtime, useTheme } from './providers';
import { LogOut, Shield, Menu, X, ChevronDown, Radio, BookOpen, User, Bot, ArrowUpRight, Search, Sun, Moon } from 'lucide-react';
import { SearchModal } from './search-modal';
import { TELEGRAM_BOT_USERNAME, TELEGRAM_BOT_URL } from '@/lib/constants';

export function Navbar() {
  const pathname = usePathname();
  const { user, loading, logout, loginDemo } = useAuth();
  const { isConnected } = useRealtime();
  const { theme, toggleTheme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showDemoMenu, setShowDemoMenu] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  const botUsername = TELEGRAM_BOT_USERNAME;

  // Global shortcut: Cmd+K or Ctrl+K or / to open search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchModalOpen((prev) => !prev);
      } else if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        setIsSearchModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  const navLinks = [
    { label: 'Dispatches', href: '/', icon: BookOpen },
    { label: 'Channels', href: '/channels', icon: Radio },
    { label: 'Profile', href: '/profile', icon: User },
  ];

  if (user?.role === 'admin' || user?.role === 'moderator') {
    navLinks.push({ label: 'Court Inquest', href: '/admin/moderation', icon: Shield });
  }

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-[var(--header-bg)] border-b-2 border-[var(--ink-border)] font-teletype shadow-md transition-colors">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
          {/* Left: Brand / Masthead */}
          <div className="flex items-center gap-3 sm:gap-6 min-w-0">
            <Link href="/" className="flex items-center gap-2 sm:gap-3 group shrink-0">
              <div className="w-8 h-8 sm:w-9 sm:h-9 border-2 border-[var(--ink-border-heavy)] bg-[var(--paper-cream)] text-[var(--ink-bg)] flex items-center justify-center font-black font-broadsheet text-base sm:text-lg shadow-[2px_2px_0px_0px_var(--shadow-color)] transition-transform group-active:scale-95">
                §
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-broadsheet font-black text-sm sm:text-lg tracking-tight text-[var(--paper-cream)] uppercase group-hover:text-[#d97706] transition-colors truncate">
                  The Lurkening
                </span>
                <span className="font-teletype text-[8px] sm:text-[9px] tracking-widest text-[var(--paper-muted)] uppercase hidden xs:inline">
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
                    className={`px-3 py-1.5 border transition-all uppercase font-bold text-xs active:scale-95 ${
                      isActive
                        ? 'bg-[var(--paper-cream)] text-[var(--ink-bg)] border-[var(--paper-cream)] shadow-[2px_2px_0px_0px_var(--shadow-color)]'
                        : 'bg-[var(--card-bg)] text-[var(--paper-muted)] border-[var(--ink-border)] hover:border-[var(--paper-cream)] hover:text-[var(--paper-cream)]'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right: Theme Switcher, Status, Universal Search & Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to Broadsheet Light Mode' : 'Switch to Ink Dark Mode'}
              className="stamp-btn !py-1.5 !px-2.5 text-xs flex items-center gap-1.5 active:scale-95 hover:border-[#d97706]"
              aria-label="Toggle Light/Dark Theme"
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
              className="stamp-btn !py-1.5 !px-2.5 sm:!px-3 text-xs flex items-center gap-1.5 sm:gap-2 hover:border-[#d97706] active:scale-95"
              title="Search Archives (Cmd+K or /)"
            >
              <Search className="w-3.5 h-3.5 text-[#d97706]" />
              <span className="hidden md:inline font-bold">SEARCH</span>
              <kbd className="hidden lg:inline px-1 bg-[var(--subtle-bg)] border border-[var(--ink-border)] text-[9px] text-[var(--paper-muted)]">
                ⌘K
              </kbd>
            </button>

            {/* Live Status Badge (Desktop) */}
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

            {/* User Section */}
            {loading ? (
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-zinc-800 animate-pulse border border-zinc-700" />
            ) : user ? (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Link
                  href="/profile"
                  className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1.5 bg-[var(--subtle-bg)] border border-[var(--ink-border)] hover:border-[var(--paper-cream)] transition-all active:scale-95"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={user.photoUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.displayName}`}
                    alt={user.displayName}
                    className="w-4 h-4 sm:w-5 sm:h-5 bg-zinc-800 object-cover shrink-0"
                  />
                  <span className="font-teletype text-xs font-semibold text-[var(--paper-cream)] hidden sm:inline max-w-[100px] lg:max-w-[130px] truncate">
                    {user.displayName}
                  </span>
                </Link>

                <button
                  onClick={logout}
                  title="Sign Out"
                  className="p-1.5 border border-[var(--ink-border)] text-[var(--paper-muted)] hover:text-rose-600 hover:border-rose-500 hover:bg-[var(--subtle-bg)] transition-colors hidden sm:inline-flex active:scale-95"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="relative flex items-center gap-1.5">
                <Link
                  href="/login"
                  className="stamp-btn !py-1 !px-2.5 sm:!py-1.5 sm:!px-3.5 text-xs font-bold"
                >
                  Sign In
                </Link>

                <button
                  onClick={() => setShowDemoMenu(!showDemoMenu)}
                  className="stamp-btn !bg-[var(--subtle-bg)] !text-[var(--paper-muted)] hover:!text-[var(--paper-cream)] !py-1 !px-1.5 sm:!py-1.5 sm:!px-2.5 flex items-center gap-1"
                  title="Quick Demo Persona"
                >
                  <span className="hidden xs:inline">Demo</span>
                  <ChevronDown className="w-3 h-3 text-[var(--paper-muted)]" />
                </button>

                {/* Demo Menu Dropdown */}
                {showDemoMenu && (
                  <div className="absolute right-0 top-11 w-52 p-2 bg-[var(--card-bg)] border-2 border-[var(--ink-border-heavy)] shadow-[6px_6px_0px_0px_var(--shadow-color)] z-50 font-teletype text-xs animate-in fade-in zoom-in-95 duration-100">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--paper-muted)] px-2 py-1 border-b border-[var(--ink-border)] mb-1">
                      Select Persona
                    </div>
                    <button
                      onClick={() => {
                        loginDemo('admin');
                        setShowDemoMenu(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 text-[var(--paper-cream)] hover:bg-[var(--paper-cream)] hover:text-[var(--ink-bg)] transition-colors font-bold flex items-center gap-2"
                    >
                      <span>✦ Royal Editor (Admin)</span>
                    </button>
                    <button
                      onClick={() => {
                        loginDemo('reader');
                        setShowDemoMenu(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 text-[var(--paper-cream)] hover:bg-[var(--paper-cream)] hover:text-[var(--ink-bg)] transition-colors font-bold flex items-center gap-2"
                    >
                      <span>✦ Citizen Reader</span>
                    </button>
                    <button
                      onClick={() => {
                        loginDemo('vip');
                        setShowDemoMenu(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 text-[var(--paper-cream)] hover:bg-[var(--paper-cream)] hover:text-[var(--ink-bg)] transition-colors font-bold flex items-center gap-2"
                    >
                      <span>✦ Foreign Envoy</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Mobile Menu Hamburger */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 border border-[var(--ink-border)] text-[var(--paper-cream)] hover:bg-[var(--subtle-bg)] active:scale-95"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X className="w-4 h-4 text-[#d97706]" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer / Dropdown */}
        {isMenuOpen && (
          <div className="md:hidden border-t-2 border-[var(--ink-border)] bg-[var(--card-bg)] p-4 flex flex-col gap-2.5 font-teletype text-xs shadow-2xl animate-in slide-in-from-top-2 duration-150">
            {/* Live connection state & theme toggle */}
            <div className="flex items-center justify-between px-3 py-2 bg-[var(--subtle-bg)] border border-[var(--ink-border)] text-[10px]">
              <span className="text-[var(--paper-muted)]">TELETYPE SYSTEM STATUS</span>
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                <span className="font-bold text-[var(--paper-cream)]">{isConnected ? 'ONLINE' : 'POLLING'}</span>
              </div>
            </div>

            {/* Theme Toggle in Mobile Menu */}
            <button
              onClick={toggleTheme}
              className="p-3 border border-[var(--ink-border)] bg-[var(--subtle-bg)] flex items-center justify-between text-[var(--paper-cream)] font-bold uppercase"
            >
              <div className="flex items-center gap-2">
                {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
                <span>APPEARANCE: {theme === 'dark' ? 'LIGHT MODE' : 'DARK MODE'}</span>
              </div>
              <span className="text-xs text-[#d97706]">[ TOGGLE ]</span>
            </button>

            {/* Nav links */}
            {navLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMenuOpen(false)}
                className={`p-3 border transition-colors flex items-center justify-between ${
                  pathname === item.href
                    ? 'bg-[var(--paper-cream)] text-[var(--ink-bg)] border-[var(--paper-cream)] font-bold'
                    : 'text-[var(--paper-cream)] border-[var(--ink-border)] hover:bg-[var(--subtle-bg)]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <item.icon className="w-4 h-4 text-[#d97706]" />
                  <span className="font-bold uppercase tracking-wider">{item.label}</span>
                </div>
                <span className="text-[10px] text-[var(--paper-muted)]">→</span>
              </Link>
            ))}

            {/* Telegram Bot Action */}
            <a
              href={`https://t.me/${botUsername}`}
              target="_blank"
              rel="noopener noreferrer"
              suppressHydrationWarning
              className="p-3 border border-[#785a28] bg-[#241c10] text-[#f6d89b] hover:bg-[#d97706] hover:text-black flex items-center justify-between transition-colors font-bold uppercase"
            >
              <div className="flex items-center gap-2" suppressHydrationWarning>
                <Bot className="w-4 h-4 text-[#d97706]" />
                <span suppressHydrationWarning>SUMMON @{botUsername}</span>
              </div>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>

            {/* Sign out if logged in on mobile */}
            {user && (
              <button
                onClick={() => {
                  logout();
                  setIsMenuOpen(false);
                }}
                className="p-2.5 border border-rose-900/60 bg-rose-950/20 text-rose-500 hover:bg-rose-900/40 flex items-center justify-center gap-2 font-bold uppercase transition-colors"
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
