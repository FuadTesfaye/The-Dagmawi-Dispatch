"use client";

import { useEffect, useState } from "react";

const REPO_URL =
  process.env.NEXT_PUBLIC_REPO_URL ?? "https://github.com/your/tg-discovery";

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5 transition-transform"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    >
      <polygon points="12 2 15 9 22 9.3 16.5 14 18.3 21 12 17 5.7 21 7.5 14 2 9.3 9 9" />
    </svg>
  );
}

export function StarButton() {
  const [stars, setStars] = useState<number | null>(null);
  const [hover, setHover] = useState(false);
  const [burst, setBurst] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/search-engine/stars")
      .then((r) => r.json())
      .then((d) => {
        if (alive && typeof d.stars === "number") setStars(d.stars);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  function fmt(n: number): string {
    return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
  }

  return (
    <a
      href={REPO_URL}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => {
        setHover(true);
        setBurst(true);
        window.setTimeout(() => setBurst(false), 500);
      }}
      onMouseLeave={() => setHover(false)}
      className="group relative ml-1 flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 font-mono text-xs text-muted transition-all hover:border-warn/50 hover:text-warn"
      aria-label="Star on GitHub"
    >
      {/* GitHub mark */}
      <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor" aria-hidden>
        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
      </svg>

      <span
        className={`relative text-warn transition-transform duration-300 ${
          hover ? "rotate-[72deg] scale-110" : ""
        }`}
      >
        <StarIcon filled={hover} />
        {/* sparkle burst */}
        {burst && (
          <>
            <span className="pointer-events-none absolute -right-1 -top-1 h-1 w-1 animate-ping rounded-full bg-warn" />
            <span className="pointer-events-none absolute -bottom-1 -left-1 h-0.5 w-0.5 animate-ping rounded-full bg-warn [animation-delay:120ms]" />
          </>
        )}
      </span>

      <span className="hidden sm:inline">Star</span>

      {/* Only show the count pill when we actually have a number. */}
      {stars != null && (
        <span className="min-w-[1.75rem] rounded bg-surface-2 px-1.5 py-0.5 text-center tabular-nums text-fg">
          {fmt(stars)}
        </span>
      )}
    </a>
  );
}
