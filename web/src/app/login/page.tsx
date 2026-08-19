'use client';

import React, { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth, useToast } from '@/components/providers';
import { Shield, UserCheck, Sparkles } from 'lucide-react';

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
    script.setAttribute('data-radius', '0');
    script.setAttribute('data-auth-url', '/api/auth/telegram');
    script.setAttribute('data-request-access', 'write');
    script.async = true;

    telegramContainerRef.current.appendChild(script);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)] max-w-md mx-auto py-8 font-teletype">
      <div className="w-full broadsheet-card p-6 sm:p-8 flex flex-col items-center text-center gap-6">
        {/* Seal Mark */}
        <div className="w-12 h-12 border-2 border-[#f4f0e6] bg-[#f4f0e6] text-[#0c0d10] flex items-center justify-center font-black font-broadsheet text-2xl shadow-[3px_3px_0px_0px_#000000]">
          §
        </div>

        <div>
          <div className="stamp-badge-gold stamp-badge mb-2 inline-block">
            AUTHENTICATION REGISTRY
          </div>
          <h1 className="font-broadsheet font-black text-2xl sm:text-3xl text-[#f4f0e6] uppercase">
            Court Scribe Entry
          </h1>
          <p className="text-xs text-[#a39e93] mt-1.5 leading-relaxed font-sans">
            Authenticate to stamp reactions, enter court testimony, and request AI synthesis.
          </p>
        </div>

        {/* Official Telegram Login Widget Container */}
        <div className="flex flex-col items-center gap-2.5 w-full py-4 bg-[#0c0d10] border border-[#262936]">
          <span className="text-[11px] font-bold text-[#f4f0e6] uppercase">
            [ TELEGRAM OIDC AUTHENTICATION ]
          </span>
          <div ref={telegramContainerRef} className="min-h-[44px] flex items-center justify-center" />
          <span className="text-[9px] text-[#a39e93]">
            SECURED VIA TELEGRAM HMAC-SHA256
          </span>
        </div>

        {/* Divider */}
        <div className="w-full flex items-center gap-3 text-[#a39e93] text-[10px]">
          <div className="flex-1 h-px bg-[#262936]" />
          <span>OR SELECT INSTANT PERSONA</span>
          <div className="flex-1 h-px bg-[#262936]" />
        </div>

        {/* One-click Instant Personas */}
        <div className="w-full flex flex-col gap-2">
          <button
            onClick={() => loginDemo('admin')}
            className="stamp-btn !bg-[#241c10] !border-[#785a28] !text-[#f6d89b] hover:!bg-[#f4f0e6] hover:!text-[#0c0d10] w-full flex items-center justify-center gap-2 !py-2.5"
          >
            <Shield className="w-4 h-4 text-[#d97706]" />
            <span>ENTER AS ROYAL SCRIBE (ADMIN)</span>
          </button>

          <button
            onClick={() => loginDemo('reader')}
            className="stamp-btn w-full flex items-center justify-center gap-2 !py-2.5"
          >
            <UserCheck className="w-4 h-4" />
            <span>ENTER AS CITIZEN READER</span>
          </button>

          <button
            onClick={() => loginDemo('vip')}
            className="stamp-btn !bg-[#12141c] !text-[#a39e93] hover:!text-[#f4f0e6] w-full flex items-center justify-center gap-2 !py-2.5"
          >
            <Sparkles className="w-4 h-4 text-[#d97706]" />
            <span>ENTER AS FOREIGN ENVOY</span>
          </button>
        </div>
      </div>
    </div>
  );
}
