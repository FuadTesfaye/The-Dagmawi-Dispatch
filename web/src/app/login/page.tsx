'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth, useToast } from '@/components/providers';
import { Bot, Loader2, ArrowUpRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { TELEGRAM_BOT_USERNAME } from '@/lib/constants';

export default function LoginPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const telegramContainerRef = useRef<HTMLDivElement>(null);

  const [botToken, setBotToken] = useState<string | null>(null);
  const [botDeepLink, setBotDeepLink] = useState<string | null>(null);
  const [isRequestingToken, setIsRequestingToken] = useState(true);
  const [isMiniAppLoading, setIsMiniAppLoading] = useState(false);
  const [authorizedUser, setAuthorizedUser] = useState<string | null>(null);

  const error = searchParams.get('error');
  const botUsername = TELEGRAM_BOT_USERNAME;

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  // Handle URL errors
  useEffect(() => {
    if (error === 'signature_failed') {
      showToast('Telegram authentication signature was invalid.', 'error');
    } else if (error === 'invalid_payload') {
      showToast('Incomplete Telegram login payload.', 'error');
    }
  }, [error, showToast]);

  // 1. Telegram Mini App Auto-detection & Login
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initData) {
      const initData = (window as any).Telegram.WebApp.initData;
      if (initData) {
        setIsMiniAppLoading(true);
        fetch('/api/auth/telegram-webapp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.success) {
              showToast('Telegram Mini App authenticated successfully!', 'success');
              router.push('/');
            }
          })
          .catch(() => {})
          .finally(() => setIsMiniAppLoading(false));
      }
    }
  }, [showToast, router]);

  // 2. Automatically generate 1-Click Bot deep link on mount
  useEffect(() => {
    let isMounted = true;
    setIsRequestingToken(true);

    fetch('/api/auth/token-request', { method: 'POST' })
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.token) {
          setBotToken(data.token);
          setBotDeepLink(data.deepLink);
        }
      })
      .catch(() => {
        if (isMounted) showToast('Failed to initialize Telegram session', 'error');
      })
      .finally(() => {
        if (isMounted) setIsRequestingToken(false);
      });

    return () => {
      isMounted = false;
    };
  }, [showToast]);

  // 3. Poll for Telegram Bot authorization confirmation
  useEffect(() => {
    if (!botToken || user) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/auth/token-status?token=${botToken}`);
        const data = await res.json();
        if (data.status === 'authorized') {
          clearInterval(interval);
          setAuthorizedUser(data.user?.displayName || data.user?.username || 'Telegram Scribe');
          showToast(`Welcome, ${data.user?.displayName || 'Scribe'}!`, 'success');
          setTimeout(() => {
            window.location.href = '/';
          }, 800);
        }
      } catch {}
    }, 2000);

    return () => clearInterval(interval);
  }, [botToken, user, showToast, router]);

  // 4. Inject Official Telegram Login Widget script
  useEffect(() => {
    if (!telegramContainerRef.current) return;
    telegramContainerRef.current.innerHTML = '';

    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', botUsername);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-radius', '0');
    script.setAttribute('data-auth-url', '/api/auth/telegram');
    script.setAttribute('data-request-access', 'write');
    script.async = true;

    telegramContainerRef.current.appendChild(script);
  }, [botUsername]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-14rem)] max-w-lg mx-auto py-6 sm:py-12 px-3 sm:px-4 font-teletype">
      <div className="w-full broadsheet-card p-5 sm:p-8 flex flex-col items-center text-center gap-5 sm:gap-6 shadow-[6px_6px_0px_0px_var(--shadow-color)] sm:shadow-[8px_8px_0px_0px_var(--shadow-color)]">
        {/* Broadsheet Seal */}
        <div className="w-12 h-12 sm:w-14 sm:h-14 border-2 border-[var(--ink-border-heavy)] bg-[var(--paper-cream)] text-[var(--ink-bg)] flex items-center justify-center font-black font-broadsheet text-2xl sm:text-3xl shadow-[3px_3px_0px_0px_var(--shadow-color)]">
          §
        </div>

        {/* Masthead Header */}
        <div className="flex flex-col gap-1">
          <div className="stamp-badge-gold stamp-badge mb-1.5 self-center text-[10px] sm:text-xs">
            AUTHENTICATION REGISTRY
          </div>
          <h1 className="font-broadsheet font-black text-2xl sm:text-3xl text-[var(--paper-cream)] uppercase tracking-tight">
            Court Scribe Entry
          </h1>
          <p className="text-xs sm:text-sm text-[var(--paper-muted)] leading-relaxed font-sans max-w-sm mx-auto">
            Authenticate directly with your <span className="text-[var(--paper-cream)] font-bold">Telegram Account</span> to stamp reactions, enter court testimony, and receive AI dispatches.
          </p>
        </div>

        {/* Mini App Loading Banner */}
        {isMiniAppLoading && (
          <div className="w-full p-3 bg-[var(--subtle-bg)] border border-[#d97706] flex items-center justify-center gap-2 text-xs text-[#d97706]">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>AUTHENTICATING TELEGRAM MINI APP SESSION...</span>
          </div>
        )}

        {/* Success State Banner */}
        {authorizedUser ? (
          <div className="w-full p-4 bg-emerald-950/40 border-2 border-emerald-500/60 flex flex-col items-center gap-2 text-emerald-200 animate-in zoom-in-95">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            <span className="font-bold text-sm uppercase">IDENTITY VERIFIED</span>
            <span className="text-xs text-emerald-300 font-sans">
              Welcome, {authorizedUser}! Entering the archive realm...
            </span>
          </div>
        ) : (
          /* Primary Authentication Panel */
          <div className="w-full flex flex-col gap-4">
            {/* Primary Option: 1-Click Telegram Bot Launch */}
            <div className="p-4 sm:p-5 bg-[var(--subtle-bg)] border-2 border-[var(--ink-border)] flex flex-col items-center gap-3.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#d97706] uppercase tracking-wider">
                <Bot className="w-4 h-4" />
                <span>1-CLICK TELEGRAM BOT LOGIN</span>
              </div>

              {isRequestingToken ? (
                <div className="py-6 flex flex-col items-center gap-2 text-[var(--paper-muted)] text-xs">
                  <Loader2 className="w-6 h-6 animate-spin text-[#d97706]" />
                  <span>PREPARING TELEGRAPH HANDSHAKE...</span>
                </div>
              ) : botDeepLink ? (
                <div className="w-full flex flex-col items-center gap-3">
                  <a
                    href={botDeepLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="stamp-btn !bg-[#d97706] !text-black !border-[#d97706] hover:!bg-[var(--paper-cream)] w-full flex items-center justify-center gap-2 !py-3 text-xs sm:text-sm font-bold active:scale-95 shadow-[3px_3px_0px_0px_var(--shadow-color)]"
                  >
                    <Bot className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>LOG IN VIA @{botUsername.toUpperCase()}</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </a>

                  {/* Step instructions */}
                  <div className="w-full flex flex-col gap-1.5 text-left text-[11px] text-[var(--paper-muted)] font-sans border-t border-[var(--ink-border)] pt-2.5">
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-[#d97706] font-teletype">[1]</span>
                      <span>Click the button above to launch @{botUsername} in Telegram.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-[#d97706] font-teletype">[2]</span>
                      <span>Press <strong className="text-[var(--paper-cream)] font-mono">Start</strong> in Telegram to confirm your identity.</span>
                    </div>
                  </div>

                  {/* Real-time waiting indicator */}
                  <div className="flex items-center gap-2 text-[10px] text-[#d97706] pt-1">
                    <span className="w-2 h-2 rounded-full bg-[#d97706] animate-ping" />
                    <span className="font-bold uppercase tracking-wider">Awaiting your confirmation in Telegram...</span>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 text-[10px] text-[var(--paper-faint)] uppercase tracking-widest">
              <div className="flex-1 h-[1px] bg-[var(--ink-border)]" />
              <span>OR VIA OFFICIAL WIDGET</span>
              <div className="flex-1 h-[1px] bg-[var(--ink-border)]" />
            </div>

            {/* Secondary Option: Official Telegram Widget Button */}
            <div className="p-4 bg-[var(--subtle-bg)] border border-[var(--ink-border)] flex flex-col items-center gap-2.5">
              <span className="text-[10px] font-bold text-[var(--paper-muted)] uppercase tracking-wider">
                OFFICIAL TELEGRAM OIDC WIDGET
              </span>
              <div ref={telegramContainerRef} className="min-h-[44px] flex items-center justify-center" />
              <span className="text-[9px] text-[var(--paper-faint)]">
                Cryptographically signed with SHA256 HMAC
              </span>
            </div>
          </div>
        )}

        {/* Security & Verification Footer */}
        <div className="text-[10px] text-[var(--paper-faint)] border-t border-[var(--ink-border)] pt-3 w-full flex items-center justify-between font-teletype">
          <div className="flex items-center gap-1.5 text-emerald-500">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>SECURE TELEGRAM OIDC</span>
          </div>
          <span>HTTPONLY JWT</span>
        </div>
      </div>
    </div>
  );
}
