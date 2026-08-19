"use client";

import { useState } from "react";

const REPO_URL =
  process.env.NEXT_PUBLIC_REPO_URL ?? "https://github.com/FuadTesfaye/The-Dagmawi-Dispatch";

/**
 * Proof-of-concept notice for the Telegram Discovery Ledger.
 */
export function DemoBanner() {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return (
    <div className="border-b border-[#262936] bg-[#171a24] font-teletype">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2 sm:px-6">
        <span className="stamp-badge-gold stamp-badge text-[9px] !py-0 !px-1.5">
          BROADSHEET DEMO
        </span>
        <p className="flex-1 text-[11px] leading-relaxed text-[#a39e93]">
          Exploring frozen telemetry from public Telegram channels. Pipeline is fully open-source:{" "}
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#d97706] hover:underline uppercase font-bold"
          >
            EXAMINE REPO ↗
          </a>
        </p>
        <button
          onClick={() => setOpen(false)}
          aria-label="dismiss"
          className="shrink-0 text-xs text-[#a39e93] hover:text-[#f4f0e6]"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
