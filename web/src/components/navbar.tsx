'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from './providers';
import { useRealtime } from './providers';
import { Scroll, Sparkles, LogIn, LogOut, Shield, Wifi, WifiOff, Menu, X, User } from 'lucide-react';

export function Navbar() {
  const { user, loading, logout, loginDemo } = useAuth();
  const { isConnected } = useRealtime();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showDemoMenu, setShowDemoMenu] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand & Royal Crest */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-zinc-950 font-black shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform duration-200">
              <Scroll className="w-5 h-5 text-zinc-950" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-zinc-100 via-amber-200 to-amber-400 bg-clip-text text-transparent">
                Dagmawi Dispatch
              </span>
              <span className="text-[10px] tracking-wider uppercase font-semibold text-amber-500/80">
                The Royal Web Platform
              </span>
            </div>
          </Link>
        </div>

        {/* Real-time Status Badge */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-400">
          {isConnected ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-zinc-300 font-medium">Live Herald SSE</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-zinc-400">Connecting...</span>
            </>
          )}
        </div>

        {/* User Authentication & Action Area */}
        <div className="flex items-center gap-3">
          {loading ? (
            <div className="w-8 h-8 rounded-full bg-zinc-800 animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-3">
              {user.role === 'admin' && (
                <Link
                  href="/admin/moderation"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 transition-colors"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Court Admin</span>
                </Link>
              )}

              <Link
                href="/profile"
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 hover:border-amber-500/40 transition-colors"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={user.photoUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.displayName}`}
                  alt={user.displayName}
                  className="w-6 h-6 rounded-full bg-zinc-800"
                />
                <span className="text-xs font-semibold text-zinc-200 hidden sm:inline max-w-[100px] truncate">
                  {user.displayName}
                </span>
              </Link>

              <button
                onClick={logout}
                title="Sign Out"
                className="p-2 rounded-full text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-md shadow-amber-500/20 active:scale-95 transition-all"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </Link>

                <button
                  onClick={() => setShowDemoMenu(!showDemoMenu)}
                  className="px-3 py-2 rounded-full text-xs font-medium bg-zinc-900 border border-zinc-800 hover:border-amber-500/30 text-amber-300 transition-colors"
                >
                  Demo Mode
                </button>
              </div>

              {/* Demo Sign In Dropdown */}
              {showDemoMenu && (
                <div className="absolute right-0 mt-2 w-56 p-2 rounded-2xl glass-panel bg-zinc-950/95 border border-amber-500/20 shadow-2xl z-50 animate-in fade-in zoom-in-95">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-400 px-3 py-1">
                    Instant Demo Login
                  </div>
                  <button
                    onClick={() => {
                      loginDemo('admin');
                      setShowDemoMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs text-zinc-200 hover:bg-amber-500/10 hover:text-amber-300 transition-colors flex items-center justify-between"
                  >
                    <span>👑 Royal Herald (Admin)</span>
                  </button>
                  <button
                    onClick={() => {
                      loginDemo('reader');
                      setShowDemoMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs text-zinc-200 hover:bg-amber-500/10 hover:text-amber-300 transition-colors flex items-center justify-between"
                  >
                    <span>📜 Scribe Apprentice</span>
                  </button>
                  <button
                    onClick={() => {
                      loginDemo('vip');
                      setShowDemoMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs text-zinc-200 hover:bg-amber-500/10 hover:text-amber-300 transition-colors flex items-center justify-between"
                  >
                    <span>🔥 Babi Superfan</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-zinc-800/80 bg-zinc-950/95 px-4 py-4 flex flex-col gap-3">
          <Link
            href="/"
            onClick={() => setIsMenuOpen(false)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-zinc-200 hover:bg-zinc-900"
          >
            <span>📜</span>
            <span>Kingdom Feed</span>
          </Link>
          <Link
            href="/channels"
            onClick={() => setIsMenuOpen(false)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-zinc-200 hover:bg-zinc-900"
          >
            <span>📡</span>
            <span>Channel Directory</span>
          </Link>
          <Link
            href="/profile"
            onClick={() => setIsMenuOpen(false)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-zinc-200 hover:bg-zinc-900"
          >
            <span>👑</span>
            <span>Your Profile</span>
          </Link>
          {user?.role === 'admin' && (
            <Link
              href="/admin/moderation"
              onClick={() => setIsMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-amber-400 hover:bg-amber-500/10"
            >
              <Shield className="w-4 h-4" />
              <span>Court Moderation</span>
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
