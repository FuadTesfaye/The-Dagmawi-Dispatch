import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-amber-400">
      <Loader2 className="w-8 h-8 animate-spin" />
      <span className="text-xs font-semibold text-zinc-400 tracking-wide uppercase">
        Summoning the Royal Dispatch...
      </span>
    </div>
  );
}
