import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-md mx-auto text-center font-teletype p-6">
      <div className="broadsheet-card p-8 sm:p-10 flex flex-col items-center gap-4 w-full">
        <div className="stamp-badge-gold stamp-badge">
          404: ARCHIVE MISSING
        </div>
        <h1 className="font-broadsheet font-black text-3xl text-[#f4f0e6] uppercase">
          Lost Parchment
        </h1>
        <p className="text-xs text-[#a39e93] font-sans leading-relaxed">
          The dispatch or ledger record you requested has either been struck from court archives or never existed.
        </p>
        <Link
          href="/"
          className="stamp-btn mt-2"
        >
          RETURN TO BROADSHEET FEED
        </Link>
      </div>
    </div>
  );
}
