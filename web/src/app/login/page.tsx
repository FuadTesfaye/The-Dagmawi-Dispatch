'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth, useToast } from '@/components/providers';
import { Shield, UserCheck, Sparkles, Bot, Loader2, ArrowUpRight, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const { user, loginDemo, loginWithHandle } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const telegramContainerRef = useRef<HTMLDivElement>(null);

  const [activeMethod, setActiveMethod] = useState<'direct' | 'personas' | 'widget' | 'bot'>('direct');
  const [handleInput, setHandleInput] = useState('');
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [botToken, setBotToken] = useState<string | null>(null);
  const [botDeepLink, setBotDeepLink] = useState<string | null>(null);
  const [isRequestingToken, setIsRequestingToken] = useState(false);
  const [isMiniAppLoading, setIsMiniAppLoading] = useState(false);

  const error = searchParams.get('error');
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'lurkening_bot';

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

  // Telegram Mini App Auto-detection & Login
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

  // Inject Telegram Login Widget script when widget tab is selected
  useEffect(() => {
    if (activeMethod !== 'widget' || !telegramContainerRef.current) return;
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
  }, [activeMethod, botUsername]);

  // Direct Handle Submit
  const handleDirectLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!handleInput.trim()) {
      showToast('Please enter your Telegram handle or username', 'info');
      return;
    }

    setIsSubmitting(true);
    const success = await loginWithHandle(handleInput.trim(), displayNameInput.trim() || undefined);
    setIsSubmitting(false);

    if (success) {
      router.push('/');
    }
  };

  // Handle requesting a 1-click bot login token
  const handleRequestBotToken = async () => {
    setIsRequestingToken(true);
    try {
      const res = await fetch('/api/auth/token-request', { method: 'POST' });
      const data = await res.json();
      if (data.token) {
        setBotToken(data.token);
        setBotDeepLink(data.deepLink);
      }
    } catch {
      showToast('Failed to initiate bot authentication', 'error');
    } finally {
      setIsRequestingToken(false);
    }
  };

  // Poll for token authorization
  useEffect(() => {
    if (!botToken || user) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/auth/token-status?token=${botToken}`);
        const data = await res.json();
        if (data.status === 'authorized') {
          clearInterval(interval);
          showToast('Authenticated via Telegram Bot!', 'success');
          router.push('/');
        }
      } catch {}
    }, 2500);

    return () => clearInterval(interval);
  }, [botToken, user, showToast, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-14rem)] max-w-lg mx-auto py-4 sm:py-8 px-3 sm:px-4 font-teletype">
      <div className="w-full broadsheet-card p-4 sm:p-8 flex flex-col items-center text-center gap-4 sm:gap-6 shadow-[6px_6px_0px_0px_var(--shadow-color)] sm:shadow-[8px_8px_0px_0px_var(--shadow-color)]">
        {/* Seal Mark */}
        <div className="w-10 h-10 sm:w-12 sm:h-12 border-2 border-[var(--ink-border-heavy)] bg-[var(--paper-cream)] text-[var(--ink-bg)] flex items-center justify-center font-black font-broadsheet text-xl sm:text-2xl shadow-[3px_3px_0px_0px_var(--shadow-color)]">
          §
        </div>

        <div>
          <div className="stamp-badge-gold stamp-badge mb-2 inline-block text-[10px]">
            AUTHENTICATION REGISTRY
          </div>
          <h1 className="font-broadsheet font-black text-2xl sm:text-3xl text-[var(--paper-cream)] uppercase">
            Court Scribe Entry
          </h1>
          <p className="text-xs text-[var(--paper-muted)] mt-1 leading-relaxed font-sans max-w-sm mx-auto">
            Log in to stamp reactions, enter court testimony, bookmark dispatches, and request AI editorial intelligence.
          </p>
        </div>

        {/* Mini App Loading Banner */}
        {isMiniAppLoading && (
          <div className="w-full p-2.5 bg-[var(--subtle-bg)] border border-[#d97706] flex items-center justify-center gap-2 text-xs text-[#d97706]">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>AUTHENTICATING TELEGRAM MINI APP SESSION...</span>
          </div>
        )}

        {/* Method Switcher Tabs */}
        <div className="grid grid-cols-4 w-full border-2 border-[var(--ink-border)] text-[10px] sm:text-xs">
          <button
            onClick={() => setActiveMethod('direct')}
            className={`py-2 px-0.5 sm:px-1 uppercase font-bold transition-colors active:scale-95 ${
              activeMethod === 'direct'
                ? 'bg-[var(--paper-cream)] text-[var(--ink-bg)]'
                : 'bg-[var(--card-bg)] text-[var(--paper-muted)] hover:text-[var(--paper-cream)]'
            }`}
          >
            HANDLE
          </button>
          <button
            onClick={() => setActiveMethod('personas')}
            className={`py-2 px-0.5 sm:px-1 uppercase font-bold transition-colors border-l border-[var(--ink-border)] active:scale-95 ${
              activeMethod === 'personas'
                ? 'bg-[var(--paper-cream)] text-[var(--ink-bg)]'
                : 'bg-[var(--card-bg)] text-[var(--paper-muted)] hover:text-[var(--paper-cream)]'
            }`}
          >
            PERSONAS
          </button>
          <button
            onClick={() => setActiveMethod('widget')}
            className={`py-2 px-0.5 sm:px-1 uppercase font-bold transition-colors border-l border-[var(--ink-border)] active:scale-95 ${
              activeMethod === 'widget'
                ? 'bg-[var(--paper-cream)] text-[var(--ink-bg)]'
                : 'bg-[var(--card-bg)] text-[var(--paper-muted)] hover:text-[var(--paper-cream)]'
            }`}
          >
            WIDGET
          </button>
          <button
            onClick={() => {
              setActiveMethod('bot');
              if (!botToken) handleRequestBotToken();
            }}
            className={`py-2 px-0.5 sm:px-1 uppercase font-bold transition-colors border-l border-[var(--ink-border)] active:scale-95 ${
              activeMethod === 'bot'
                ? 'bg-[var(--paper-cream)] text-[var(--ink-bg)]'
                : 'bg-[var(--card-bg)] text-[var(--paper-muted)] hover:text-[var(--paper-cream)]'
            }`}
          >
            BOT LINK
          </button>
        </div>

        {/* Method 1: Direct Web Handle Login */}
        {activeMethod === 'direct' && (
          <form onSubmit={handleDirectLogin} className="flex flex-col gap-3 w-full text-left">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold text-[#d97706] tracking-wider">
                TELEGRAM HANDLE / USERNAME *
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-[var(--paper-muted)] text-sm">@</span>
                <input
                  type="text"
                  value={handleInput}
                  onChange={(e) => setHandleInput(e.target.value)}
                  placeholder="dagmawi_babi, fuad, or handle"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  required
                  className="w-full pl-8 pr-3 py-2.5 bg-[var(--input-bg)] border border-[var(--ink-border)] text-[var(--paper-cream)] placeholder-[var(--paper-faint)] text-sm font-teletype uppercase focus:border-[#d97706] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold text-[var(--paper-muted)] tracking-wider">
                DISPLAY NAME (OPTIONAL)
              </label>
              <input
                type="text"
                value={displayNameInput}
                onChange={(e) => setDisplayNameInput(e.target.value)}
                placeholder="Dagmawi Babi / Royal Scribe"
                className="w-full px-3 py-2 bg-[var(--input-bg)] border border-[var(--ink-border)] text-[var(--paper-cream)] placeholder-[var(--paper-faint)] text-xs font-teletype focus:border-[#d97706] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="stamp-btn !bg-[#d97706] !text-black !border-[#d97706] hover:!bg-[var(--paper-cream)] w-full flex items-center justify-center gap-2 !py-2.5 text-xs font-bold mt-1 active:scale-95"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>ENTERING TELEGRAPH WIRES...</span>
                </>
              ) : (
                <>
                  <span>ENTER AS SCRIBE</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Method 2: Instant Personas */}
        {activeMethod === 'personas' && (
          <div className="w-full flex flex-col gap-2">
            <button
              onClick={() => loginDemo('admin')}
              className="stamp-btn !bg-[#241c10] !border-[#785a28] !text-[#f6d89b] hover:!bg-[var(--paper-cream)] hover:!text-[var(--ink-bg)] w-full flex items-center justify-center gap-2 !py-2.5 text-xs active:scale-95"
            >
              <Shield className="w-4 h-4 text-[#d97706]" />
              <span>ENTER AS ROYAL SCRIBE (ADMIN)</span>
            </button>

            <button
              onClick={() => loginDemo('reader')}
              className="stamp-btn w-full flex items-center justify-center gap-2 !py-2.5 text-xs active:scale-95"
            >
              <UserCheck className="w-4 h-4" />
              <span>ENTER AS CITIZEN READER</span>
            </button>

            <button
              onClick={() => loginDemo('vip')}
              className="stamp-btn !bg-[var(--card-bg)] !text-[var(--paper-muted)] hover:!text-[var(--paper-cream)] w-full flex items-center justify-center gap-2 !py-2.5 text-xs active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-[#d97706]" />
              <span>ENTER AS FOREIGN ENVOY</span>
            </button>
          </div>
        )}

        {/* Method 3: Official Telegram Widget */}
        {activeMethod === 'widget' && (
          <div className="flex flex-col items-center gap-3 w-full py-4 px-3 bg-[var(--subtle-bg)] border border-[var(--ink-border)]">
            <span className="text-[11px] font-bold text-[var(--paper-cream)] uppercase">
              [ TELEGRAM OIDC AUTHENTICATION ]
            </span>
            <p className="text-[11px] text-[var(--paper-muted)] font-sans">
              Authenticates securely via Telegram HMAC-SHA256 signature with @{botUsername}.
            </p>
            <div ref={telegramContainerRef} className="min-h-[44px] flex items-center justify-center my-1" />
            <span className="text-[9px] text-[var(--paper-faint)]">
              Requires domain registered with @BotFather (/setdomain)
            </span>
          </div>
        )}

        {/* Method 4: Direct Bot Summon Link */}
        {activeMethod === 'bot' && (
          <div className="flex flex-col items-center gap-3 w-full py-4 px-3 bg-[var(--subtle-bg)] border border-[var(--ink-border)]">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#d97706] uppercase">
              <Bot className="w-4 h-4" />
              <span>[ 1-CLICK BOT HANDSHAKE ]</span>
            </div>
            <p className="text-[11px] text-[var(--paper-muted)] font-sans">
              Launch @{botUsername} in Telegram to grant instant session access without browser cookies.
            </p>

            {isRequestingToken ? (
              <Loader2 className="w-5 h-5 animate-spin text-[#d97706]" />
            ) : botDeepLink ? (
              <div className="w-full flex flex-col items-center gap-2">
                <a
                  href={botDeepLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="stamp-btn !bg-[#d97706] !text-black !border-[#d97706] hover:!bg-[var(--paper-cream)] w-full flex items-center justify-center gap-2 !py-2.5 text-xs font-bold active:scale-95"
                >
                  <Bot className="w-4 h-4" />
                  <span>OPEN @{botUsername}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </a>

                <div className="flex items-center gap-2 text-[10px] text-[var(--paper-muted)] animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-[#d97706]" />
                  <span>AWAITING TELEGRAM AUTHORIZATION...</span>
                </div>
              </div>
            ) : (
              <button
                onClick={handleRequestBotToken}
                className="stamp-btn text-xs !py-2 px-4 active:scale-95"
              >
                GENERATE LOGIN LINK
              </button>
            )}
          </div>
        )}

        {/* Security Notice */}
        <div className="text-[10px] text-[var(--paper-faint)] border-t border-[var(--ink-border)] pt-3 w-full flex items-center justify-between">
          <span>HTTPONLY JWT ENCRYPTION</span>
          <span>EST. 2026 DISPATCH</span>
        </div>
      </div>
    </div>
  );
}
