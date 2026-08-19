"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function SearchBar({
  initial = "",
  size = "md",
  autoFocus = false,
}: {
  initial?: string;
  size?: "md" | "lg";
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = value.trim();
    if (!q) return;
    startTransition(() => {
      router.push(`/explorer/search?q=${encodeURIComponent(q)}`);
    });
  }

  const pad = size === "lg" ? "py-3.5 text-sm sm:text-base" : "py-2.5 text-xs sm:text-sm";

  return (
    <form onSubmit={submit} className="w-full font-teletype">
      <div className="group flex items-center gap-2.5 bg-[#12141c] border-2 border-[#262936] px-3.5 shadow-[4px_4px_0px_0px_#000000] focus-within:border-[#f4f0e6] transition-colors">
        <span className="font-bold text-[#d97706] select-none text-sm">{">"}</span>
        <input
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="SEARCH TELEGRAM CHANNELS & POSTS..."
          spellCheck={false}
          className={`flex-1 bg-transparent text-[#f4f0e6] placeholder:text-[#6b665c] uppercase focus:outline-none ${pad}`}
        />
        <button
          type="submit"
          disabled={pending}
          className="stamp-btn !py-1 !px-3 !text-xs shrink-0"
        >
          {pending ? "..." : "QUERY"}
        </button>
      </div>
    </form>
  );
}
