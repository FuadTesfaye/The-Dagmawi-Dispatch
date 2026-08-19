"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Renders a single Telegram post using Telegram's official embed widget.
 * `tgUrl` is like https://t.me/<channel>/<id>; the widget shows the post
 * including any image/media. Works for public channels only.
 */
export function TelegramPost({ tgUrl }: { tgUrl: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);

  // Strip the leading https://t.me/ to get the "channel/id" the widget expects.
  const post = tgUrl.replace(/^https?:\/\/t\.me\//, "");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-post", post);
    script.setAttribute("data-width", "100%");
    script.setAttribute("data-dark", "1");
    script.onload = () => setLoaded(true);
    el.appendChild(script);

    return () => {
      el.innerHTML = "";
    };
  }, [post]);

  return (
    <div className="overflow-hidden bg-[#12141c] border border-[#262936] p-2">
      {!loaded && (
        <div className="flex items-center gap-2 px-3 py-4 font-teletype text-[11px] text-[#a39e93] uppercase">
          <span className="h-2 w-2 animate-pulse bg-[#d97706]" />
          [ DECODING TELETYPE EMBED WIRE... ]
        </div>
      )}
      <div ref={ref} />
    </div>
  );
}
