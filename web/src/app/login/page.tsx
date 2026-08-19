'use client';

import React, { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth, useToast } from '@/components/providers';
import { Scroll, Shield, UserCheck, Sparkles, LogIn } from 'lucide-react';

export default function LoginPage() {
  const { user, loginDemo } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const telegramContainerRef = useRef<HTMLDivElement>(null);

  const error = searchParams.get('error');

  useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  useEffect(() => {
    if (error === 'signature_failed') {
      showToast('Telegram authentication signature was invalid.', 'error');
    } else if (error === 'invalid_payload') {
      showToast('Incomplete Telegram login payload.', 'error');
    }
  }, [error, showToast]);

  // Inject Telegram Login Widget script
  useEffect(() => {
    if (!telegramContainerRef.current) return;
    telegramContainerRef.current.innerHTML = '';

    const botName = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'BabisummarizeBot';

    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', botName);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-radius', '12');
    script.setAttribute('data-auth-url', '/api/auth/telegram');
    script.setAttribute('data-request-access', 'write');
    script.async = true;

    telegramContainerRef.current.appendChild(script);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)] max-w-md mx-auto py-8">
      <div className="w-full glass-panel bg-zinc-950/90 rounded-3xl border border-amber-500/30 p-8 shadow-2xl flex flex-col items-center text-center gap-6">
        {/* Crown Icon */}
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-zinc-950 shadow-xl shadow-amber-500/20">
          <Scroll className="w-8 h-8 text-zinc-950" />
        </div>

        <div>
          <h1 className="text-2xl font-black tracking-tight text-zinc-100">
            Enter the Royal Court
          </h1>
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
            Sign in with Telegram to react, comment, subscribe, and request custom AI commentary.
          </p>
        </div>

        {/* Official Telegram Login Widget Container */}
        <div className="flex flex-col items-center gap-3 w-full py-3 bg-zinc-900/60 rounded-2xl border border-zinc-800">
          <span className="text-xs font-semibold text-zinc-300">
            Official Telegram Auth
          </span>
          <div ref={telegramContainerRef} className="min-h-[44px] flex items-center justify-center" />
          <span className="text-[10px] text-zinc-500">
            Uses secure HMAC-SHA256 OAuth verification
          </span>
        </div>

        {/* Divider */}
        <div className="w-full flex items-center gap-3 text-zinc-600 text-xs">
          <div className="flex-1 h-px bg-zinc-800" />
          <span>OR DEV PREVIEW</span>
          <div className="flex-1 h-px bg-zinc-800" />
        </div>

        {/* One-click Instant Personas */}
        <div className="w-full flex flex-col gap-2">
          <button
            onClick={() => loginDemo('admin')}
            className="w-full py-3 px-4 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold transition-all flex items-center justify-center gap-2"
          >
            <Shield className="w-4 h-4 text-amber-400" />
            <span>Sign in as Royal Herald (Admin Demo)</span>
          </button>

          <button
            onClick={() => loginDemo('reader')}
            className="w-full py-2.5 px-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-semibold transition-all flex items-center justify-center gap-2"
          >
            <UserCheck className="w-4 h-4 text-zinc-400" />
            <span>Sign in as Scribe Apprentice</span>
          </button>

          <button
            onClick={() => loginDemo('vip')}
            className="w-full py-2.5 px-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-semibold transition-all flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Sign in as Babi Superfan</span>
          </button>
        </div>
      </div>
    </div>
  );
}
