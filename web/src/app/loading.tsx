import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-[var(--paper-muted)] font-teletype">
      <Loader2 className="w-6 h-6 animate-spin text-[#d97706]" />
      <span className="text-xs uppercase tracking-widest text-[var(--paper-cream)] font-bold">
        [ DECODING TELETYPE WIRES... ]
      </span>
    </div>
  );
}
