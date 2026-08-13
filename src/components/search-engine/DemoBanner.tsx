"use client";

import { useState } from "react";

const REPO_URL =
  process.env.NEXT_PUBLIC_REPO_URL ?? "https://github.com/your/tg-discovery";

/**
 * Proof-of-concept notice: this deployment explores a frozen dataset the author
 * already crawled. The pipeline (crawler + local LLM) is open source so anyone
 * can build their own.
 */
export function DemoBanner() {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return (
    <div className="border-b border-accent/20 bg-accent/5">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2 sm:px-6">
        <span className="rounded border border-accent/40 bg-accent/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-accent">
          demo
        </span>
        <p className="flex-1 font-mono text-[11px] leading-relaxed text-muted">
          Proof of concept — exploring a frozen snapshot of public channels
          already crawled. The full crawler + analysis pipeline is open source:{" "}
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            run your own ↗
          </a>
        </p>
        <button
          onClick={() => setOpen(false)}
          aria-label="dismiss"
          className="shrink-0 font-mono text-xs text-muted hover:text-fg-bright"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
