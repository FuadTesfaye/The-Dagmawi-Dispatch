"use client";

import { useEffect, useState } from "react";

const REPO_URL =
  process.env.NEXT_PUBLIC_REPO_URL ?? "https://github.com/FuadTesfaye/The-Dagmawi-Dispatch";

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5"
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
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="stamp-btn !py-1 !px-2.5 flex items-center gap-1.5 !text-[11px]"
      aria-label="Star on GitHub"
    >
      <StarIcon filled={hover} />
      <span className="hidden sm:inline">STAR</span>
      {stars != null && (
        <span className="px-1 bg-[#0c0d10] border border-[#262936] text-[10px] text-[#d97706] font-bold">
          {fmt(stars)}
        </span>
      )}
    </a>
  );
}
