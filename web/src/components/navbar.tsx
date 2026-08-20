'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth, useRealtime } from './providers';
import { LogOut, Shield, Menu, X, ChevronDown, Radio, BookOpen, User, Bot, ArrowUpRight } from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();
  const { user, loading, logout, loginDemo } = useAuth();
  const { isConnected } = useRealtime();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showDemoMenu, setShowDemoMenu] = useState(false);

  const navLinks = [
    { label: 'Dispatches', href: '/', icon: BookOpen },
    { label: 'Channels', href: '/channels', icon: Radio },
    { label: 'Profile', href: '/profile', icon: User },
  ];

  if (user?.role === 'admin' || user?.role === 'moderator') {
    navLinks.push({ label: 'Court Inquest', href: '/admin/moderation', icon: Shield });
  }

  return (
    <header className="sticky top-0 z-40 w-full bg-[#12141c] border-b-2 border-[#262936] double-rule-b font-teletype">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand / Masthead */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 border-2 border-[#f4f0e6] bg-[#f4f0e6] text-[#0c0d10] flex items-center justify-center font-black font-broadsheet text-lg shadow-[2px_2px_0px_0px_#262936] shrink-0">
              §
            </div>
            <div className="flex flex-col">
              <span className="font-broadsheet font-black text-base sm:text-lg tracking-tight text-[#f4f0e6] uppercase group-hover:text-[#d97706] transition-colors">
                The Lurkening
              </span>
              <span className="font-teletype text-[9px] tracking-widest text-[#a39e93] uppercase hidden xs:inline">
                Gazette & Teleprinter
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 font-teletype text-xs">
            {navLinks.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 border transition-all uppercase font-bold text-xs ${
                    isActive
                      ? 'bg-[#f4f0e6] text-[#0c0d10] border-[#f4f0e6] shadow-[2px_2px_0px_0px_#000000]'
                      : 'bg-[#12141c] text-[#a39e93] border-[#262936] hover:border-[#f4f0e6] hover:text-[#f4f0e6]'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: Status & Actions */}
        <div className="flex items-center gap-3">
          {/* Live Status Badge */}
          <div className="hidden lg:flex items-center gap-2 font-teletype text-[10px] px-2.5 py-1 bg-[#171a24] border border-[#262936] text-[#d6d0c2]">
            <span className={`w-2 h-2 ${isConnected ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            <span>{isConnected ? 'TELETYPE: CONNECTED' : 'TELETYPE: POLLING'}</span>
          </div>

          {/* Bot Callout */}
          <a
            href="https://t.me/lurklord_bot"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 stamp-btn !bg-[#241c10] !border-[#785a28] !text-[#f6d89b] hover:!bg-[#d97706] hover:!text-black !py-1.5 !px-3"
          >
            <Bot className="w-3.5 h-3.5 text-[#d97706]" />
            <span>@lurklord_bot</span>
            <ArrowUpRight className="w-3 h-3 opacity-70" />
          </a>

          {/* User Section */}
          {loading ? (
            <div className="w-8 h-8 bg-zinc-800 animate-pulse border border-zinc-700" />
          ) : user ? (
            <div className="flex items-center gap-2">
              <Link
                href="/profile"
                className="flex items-center gap-2 px-2.5 py-1.5 bg-[#171a24] border border-[#262936] hover:border-[#f4f0e6] transition-all"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={user.photoUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.displayName}`}
                  alt={user.displayName}
                  className="w-4 h-4 bg-zinc-800 object-cover"
                />
                <span className="font-teletype text-xs font-semibold text-[#f4f0e6] hidden sm:inline max-w-[120px] truncate">
                  {user.displayName}
                </span>
              </Link>

              <button
                onClick={logout}
                title="Sign Out"
                className="p-1.5 border border-[#262936] text-[#a39e93] hover:text-rose-400 hover:border-rose-500 hover:bg-[#171a24] transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="relative flex items-center gap-2">
              <Link
                href="/login"
                className="stamp-btn !py-1.5 !px-3.5"
              >
                Sign In
              </Link>

              <button
                onClick={() => setShowDemoMenu(!showDemoMenu)}
                className="stamp-btn !bg-[#12141c] !text-[#a39e93] hover:!text-[#f4f0e6] !py-1.5 !px-2.5 flex items-center gap-1"
              >
                <span>Demo</span>
                <ChevronDown className="w-3 h-3 text-[#a39e93]" />
              </button>

              {/* Demo Menu */}
              {showDemoMenu && (
                <div className="absolute right-0 top-11 w-52 p-2 bg-[#12141c] border-2 border-[#3d4257] shadow-[6px_6px_0px_0px_#000000] z-50 font-teletype text-xs">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-[#a39e93] px-2 py-1 border-b border-[#262936] mb-1">
                    Select Persona
                  </div>
                  <button
                    onClick={() => {
                      loginDemo('admin');
                      setShowDemoMenu(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 text-[#f4f0e6] hover:bg-[#f4f0e6] hover:text-[#0c0d10] transition-colors font-bold flex items-center gap-2"
                  >
                    <span>✦ Royal Editor</span>
                  </button>
                  <button
                    onClick={() => {
                      loginDemo('reader');
                      setShowDemoMenu(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 text-[#f4f0e6] hover:bg-[#f4f0e6] hover:text-[#0c0d10] transition-colors font-bold flex items-center gap-2"
                  >
                    <span>✦ Citizen Reader</span>
                  </button>
                  <button
                    onClick={() => {
                      loginDemo('vip');
                      setShowDemoMenu(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 text-[#f4f0e6] hover:bg-[#f4f0e6] hover:text-[#0c0d10] transition-colors font-bold flex items-center gap-2"
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
            className="md:hidden p-2 border border-[#262936] text-[#f4f0e6] hover:bg-[#171a24]"
          >
            {isMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isMenuOpen && (
        <div className="md:hidden border-t-2 border-[#262936] bg-[#12141c] p-4 flex flex-col gap-2 font-teletype text-xs">
          {navLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsMenuOpen(false)}
              className={`p-2.5 border transition-colors flex items-center gap-2 ${
                pathname === item.href
                  ? 'bg-[#f4f0e6] text-[#0c0d10] border-[#f4f0e6]'
                  : 'text-[#f4f0e6] border-[#262936] hover:bg-[#171a24]'
              }`}
            >
              <item.icon className="w-4 h-4 text-[#d97706]" />
              <span className="font-bold uppercase">{item.label}</span>
            </Link>
          ))}
          <a
            href="https://t.me/lurklord_bot"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2.5 border border-[#785a28] bg-[#241c10] text-[#f6d89b] flex items-center justify-between"
          >
            <span>SUMMON @lurklord_bot</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
        </div>
      )}
    </header>
  );
}
