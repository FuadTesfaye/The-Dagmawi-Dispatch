'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth, useRealtime } from './providers';
import { LogIn, LogOut, Shield, Menu, X, Sparkles, User, ChevronDown } from 'lucide-react';

export function Navbar() {
  const { user, loading, logout, loginDemo } = useAuth();
  const { isConnected } = useRealtime();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showDemoMenu, setShowDemoMenu] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full matte-header">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-950 font-black text-xs">
              D
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-bold text-sm tracking-tight text-white group-hover:text-zinc-300 transition-colors">
                Dagmawi Dispatch
              </span>
              <span className="text-[10px] tracking-widest uppercase font-semibold text-zinc-500 hidden sm:inline">
                Editorial
              </span>
            </div>
          </Link>
        </div>

        {/* Live SSE Status */}
        <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-400">
          <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-amber-400'}`} />
          <span>{isConnected ? 'Live Stream' : 'Connecting'}</span>
        </div>

        {/* User Auth & Actions */}
        <div className="flex items-center gap-2.5">
          {loading ? (
            <div className="w-7 h-7 rounded-md bg-zinc-800 animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-2">
              {user.role === 'admin' && (
                <Link
                  href="/admin/moderation"
                  className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold text-zinc-300 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors"
                >
                  <Shield className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Admin</span>
                </Link>
              )}

              <Link
                href="/profile"
                className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors text-xs text-zinc-300"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={user.photoUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.displayName}`}
                  alt={user.displayName}
                  className="w-4 h-4 rounded-full bg-zinc-800"
                />
                <span className="font-medium hidden sm:inline max-w-[100px] truncate">
                  {user.displayName}
                </span>
              </Link>

              <button
                onClick={logout}
                title="Sign Out"
                className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="relative flex items-center gap-2">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-zinc-100 hover:bg-white text-zinc-950 transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </Link>

              <button
                onClick={() => setShowDemoMenu(!showDemoMenu)}
                className="px-2.5 py-1.5 rounded-md text-xs font-medium bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1"
              >
                <span>Demo</span>
                <ChevronDown className="w-3 h-3 opacity-60" />
              </button>

              {/* Demo Sign In Dropdown */}
              {showDemoMenu && (
                <div className="absolute right-0 top-9 w-52 p-1.5 rounded-xl bg-zinc-950 border border-zinc-800 shadow-2xl z-50">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 px-2 py-1">
                    Select Persona
                  </div>
                  <button
                    onClick={() => {
                      loginDemo('admin');
                      setShowDemoMenu(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-zinc-300 hover:bg-zinc-900 transition-colors"
                  >
                    Editor / Admin
                  </button>
                  <button
                    onClick={() => {
                      loginDemo('reader');
                      setShowDemoMenu(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-zinc-300 hover:bg-zinc-900 transition-colors"
                  >
                    Subscriber / Reader
                  </button>
                  <button
                    onClick={() => {
                      loginDemo('vip');
                      setShowDemoMenu(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-zinc-300 hover:bg-zinc-900 transition-colors"
                  >
                    VIP Contributor
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-1.5 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900"
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-zinc-800 bg-zinc-950 px-4 py-3 flex flex-col gap-2">
          <Link
            href="/"
            onClick={() => setIsMenuOpen(false)}
            className="px-3 py-2 rounded-lg text-xs font-medium text-zinc-300 hover:bg-zinc-900"
          >
            Publication Feed
          </Link>
          <Link
            href="/channels"
            onClick={() => setIsMenuOpen(false)}
            className="px-3 py-2 rounded-lg text-xs font-medium text-zinc-300 hover:bg-zinc-900"
          >
            Channel Index
          </Link>
          <Link
            href="/profile"
            onClick={() => setIsMenuOpen(false)}
            className="px-3 py-2 rounded-lg text-xs font-medium text-zinc-300 hover:bg-zinc-900"
          >
            Subscriptions
          </Link>
          {user?.role === 'admin' && (
            <Link
              href="/admin/moderation"
              onClick={() => setIsMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-xs font-medium text-zinc-300 hover:bg-zinc-900"
            >
              Moderation Panel
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
