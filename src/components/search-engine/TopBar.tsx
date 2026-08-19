"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { StarButton } from "./StarButton";

const LINKS = [
  { href: "/explorer/search", label: "01 SEARCH" },
  { href: "/explorer/categories", label: "02 CATEGORIES" },
  { href: "/explorer/graph", label: "03 GRAPH" },
  { href: "/explorer/dashboard", label: "04 DASHBOARD" },
  { href: "/explorer/docs", label: "05 DOCS" },
];

export function TopBar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="relative border-b-2 border-[#262936] py-3.5 bg-[#12141c] font-teletype">
      <div className="flex items-center justify-between gap-2 max-w-7xl mx-auto px-4">
        <Link
          href="/explorer"
          className="group flex min-w-0 items-center gap-2.5"
          onClick={() => setOpen(false)}
        >
          <div className="w-8 h-8 border-2 border-[#f4f0e6] bg-[#f4f0e6] text-[#0c0d10] flex items-center justify-center font-black font-broadsheet text-base shadow-[2px_2px_0px_0px_#262936] shrink-0">
            §
          </div>
          <span className="truncate font-teletype text-xs sm:text-sm font-bold tracking-tight text-[#f4f0e6] uppercase">
            Telegram Search Engine
            <span className="ml-1 hidden h-3 w-1.5 bg-[#d97706] align-middle animate-pulse sm:inline-block" />
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1.5 font-teletype text-xs md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="px-2.5 py-1 text-[#a39e93] border border-transparent hover:border-[#262936] hover:bg-[#171a24] hover:text-[#f4f0e6] transition-colors"
            >
              {l.label}
            </Link>
          ))}
          <StarButton />
        </nav>

        {/* Mobile: star + hamburger */}
        <div className="flex items-center gap-1.5 md:hidden">
          <StarButton />
          <button
            onClick={() => setOpen((o) => !o)}
            aria-label="Toggle menu"
            aria-expanded={open}
            className="flex h-8 w-8 items-center justify-center border border-[#262936] bg-[#171a24] text-[#f4f0e6]"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              {open ? (
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {open && (
        <nav className="absolute left-0 right-0 top-full z-30 mt-px flex flex-col gap-1 border-b-2 border-[#262936] bg-[#12141c] p-3 font-teletype text-xs md:hidden">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="p-2 border border-[#262936] text-[#a39e93] hover:text-[#f4f0e6] hover:bg-[#171a24] transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
