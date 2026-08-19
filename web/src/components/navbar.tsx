'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth, useRealtime } from './providers';
import { LogIn, LogOut, Shield, Menu, X, Stamp, Radio, ChevronDown } from 'lucide-react';

export function Navbar() {
  const { user, loading, logout, loginDemo } = useAuth();
  const { isConnected } = useRealtime();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showDemoMenu, setShowDemoMenu] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full bg-[#12141c] border-b-2 border-[#262936] double-rule-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Masthead Brand */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 border-2 border-[#f4f0e6] bg-[#f4f0e6] text-[#0c0d10] flex items-center justify-center font-black font-broadsheet text-lg shadow-[2px_2px_0px_0px_#262936]">
              §
            </div>
            <div className="flex flex-col">
              <span className="font-broadsheet font-black text-lg sm:text-xl tracking-tight text-[#f4f0e6] uppercase">
                The Dagmawi Dispatch
              </span>
              <span className="font-teletype text-[9px] tracking-widest text-[#a39e93] uppercase">
                Gazette & Telegram Chronometer
              </span>
            </div>
          </Link>
        </div>

        {/* Teletype Stream Indicator */}
        <div className="hidden md:flex items-center gap-2 font-teletype text-[11px] px-3 py-1 bg-[#171a24] border border-[#262936] text-[#d6d0c2]">
          <span className={`w-2 h-2 ${isConnected ? 'bg-emerald-400' : 'bg-amber-400'}`} />
          <span>{isConnected ? 'TELETYPE: CONNECTED' : 'TELETYPE: POLLING'}</span>
        </div>

        {/* User Auth & Actions */}
        <div className="flex items-center gap-3">
          {loading ? (
            <div className="w-8 h-8 bg-zinc-800 animate-pulse border border-zinc-700" />
          ) : user ? (
            <div className="flex items-center gap-2.5">
              {user.role === 'admin' && (
                <Link
                  href="/admin/moderation"
                  className="hidden sm:inline-flex items-center gap-1.5 stamp-badge stamp-badge-gold"
                >
                  <Shield className="w-3 h-3" />
                  <span>COURT SCRIBE</span>
                </Link>
              )}

              <Link
                href="/profile"
                className="flex items-center gap-2 px-2.5 py-1 bg-[#171a24] border border-[#262936] hover:border-[#f4f0e6] transition-colors"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={user.photoUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.displayName}`}
                  alt={user.displayName}
                  className="w-4 h-4 rounded-none bg-zinc-800"
                />
                <span className="font-teletype text-xs font-semibold text-[#f4f0e6] hidden sm:inline max-w-[110px] truncate">
                  {user.displayName}
                </span>
              </Link>

              <button
                onClick={logout}
                title="Sign Out"
                className="p-1.5 border border-[#262936] text-[#a39e93] hover:text-[#f4f0e6] hover:bg-[#171a24] transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="relative flex items-center gap-2">
              <Link
                href="/login"
                className="stamp-btn"
              >
                Sign In
              </Link>

              <button
                onClick={() => setShowDemoMenu(!showDemoMenu)}
                className="stamp-btn !bg-[#12141c] !text-[#a39e93] hover:!text-[#f4f0e6] flex items-center gap-1"
              >
                <span>Personas</span>
                <ChevronDown className="w-3 h-3" />
              </button>

              {/* Demo Sign In Dropdown */}
              {showDemoMenu && (
                <div className="absolute right-0 top-10 w-56 p-2 bg-[#12141c] border-2 border-[#3d4257] shadow-[6px_6px_0px_0px_#000000] z-50 font-teletype text-xs">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-[#a39e93] px-2 py-1 border-b border-[#262936] mb-1">
                    Select Scribe
                  </div>
                  <button
                    onClick={() => {
                      loginDemo('admin');
                      setShowDemoMenu(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 text-[#f4f0e6] hover:bg-[#f4f0e6] hover:text-[#0c0d10] transition-colors font-bold flex items-center justify-between"
                  >
                    <span>✦ Royal Editor</span>
                  </button>
                  <button
                    onClick={() => {
                      loginDemo('reader');
                      setShowDemoMenu(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 text-[#f4f0e6] hover:bg-[#f4f0e6] hover:text-[#0c0d10] transition-colors font-bold flex items-center justify-between"
                  >
                    <span>✦ Citizen Reader</span>
                  </button>
                  <button
                    onClick={() => {
                      loginDemo('vip');
                      setShowDemoMenu(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 text-[#f4f0e6] hover:bg-[#f4f0e6] hover:text-[#0c0d10] transition-colors font-bold flex items-center justify-between"
                  >
                    <span>✦ Foreign Envoy</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-1.5 border border-[#262936] text-[#f4f0e6] hover:bg-[#171a24]"
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isMenuOpen && (
        <div className="md:hidden border-t-2 border-[#262936] bg-[#12141c] p-4 flex flex-col gap-2 font-teletype text-xs">
          <Link
            href="/"
            onClick={() => setIsMenuOpen(false)}
            className="p-2 border border-[#262936] hover:bg-[#f4f0e6] hover:text-[#0c0d10] text-[#f4f0e6]"
          >
            [01] BROADSHEET FEED
          </Link>
          <Link
            href="/channels"
            onClick={() => setIsMenuOpen(false)}
            className="p-2 border border-[#262936] hover:bg-[#f4f0e6] hover:text-[#0c0d10] text-[#f4f0e6]"
          >
            [02] MONITORED CHANNELS
          </Link>
          <Link
            href="/profile"
            onClick={() => setIsMenuOpen(false)}
            className="p-2 border border-[#262936] hover:bg-[#f4f0e6] hover:text-[#0c0d10] text-[#f4f0e6]"
          >
            [03] SCRIBE CREDENTIALS
          </Link>
          {user?.role === 'admin' && (
            <Link
              href="/admin/moderation"
              onClick={() => setIsMenuOpen(false)}
              className="p-2 border border-[#785a28] bg-[#241c10] text-[#f6d89b]"
            >
              [!] COURT MODERATION
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
