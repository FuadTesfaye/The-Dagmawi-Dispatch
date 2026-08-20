'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth, useToast } from '@/components/providers';
import { Shield, UserCheck, Sparkles, Bot, Loader2, ArrowUpRight, ExternalLink } from 'lucide-react';

export default function LoginPage() {
  const { user, loginDemo } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const telegramContainerRef = useRef<HTMLDivElement>(null);

  const [activeMethod, setActiveMethod] = useState<'widget' | 'bot' | 'personas'>('widget');
  const [botToken, setBotToken] = useState<string | null>(null);
  const [botDeepLink, setBotDeepLink] = useState<string | null>(null);
  const [isRequestingToken, setIsRequestingToken] = useState(false);
  const [isMiniAppLoading, setIsMiniAppLoading] = useState(false);

  const error = searchParams.get('error');
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'BabisummarizeBot';

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
              window.location.href = '/';
            }
          })
          .catch(() => {})
          .finally(() => setIsMiniAppLoading(false));
      }
    }
  }, [showToast]);

  // Inject Telegram Login Widget script
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
          window.location.href = '/';
        }
      } catch {}
    }, 2500);

    return () => clearInterval(interval);
  }, [botToken, user, showToast]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)] max-w-lg mx-auto py-8 px-4 font-teletype">
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
            Authenticate to stamp reactions, enter court testimony, and request AI synthesis across all telegram wires.
          </p>
        </div>

        {/* Mini App Loading Banner */}
        {isMiniAppLoading && (
          <div className="w-full p-3 bg-[#171a24] border border-[#d97706] flex items-center justify-center gap-2 text-xs text-[#d97706]">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>AUTHENTICATING TELEGRAM MINI APP SESSION...</span>
          </div>
        )}

        {/* Method Switcher Tabs */}
        <div className="grid grid-cols-3 w-full border border-[#262936] text-[10px] sm:text-xs">
          <button
            onClick={() => setActiveMethod('widget')}
            className={`py-2 px-1 uppercase font-bold transition-colors ${
              activeMethod === 'widget'
                ? 'bg-[#f4f0e6] text-[#0c0d10]'
                : 'bg-[#12141c] text-[#a39e93] hover:text-[#f4f0e6]'
            }`}
          >
            OFFICIAL WIDGET
          </button>
          <button
            onClick={() => {
              setActiveMethod('bot');
              if (!botToken) handleRequestBotToken();
            }}
            className={`py-2 px-1 uppercase font-bold transition-colors border-x border-[#262936] ${
              activeMethod === 'bot'
                ? 'bg-[#f4f0e6] text-[#0c0d10]'
                : 'bg-[#12141c] text-[#a39e93] hover:text-[#f4f0e6]'
            }`}
          >
            BOT SUMMON
          </button>
          <button
            onClick={() => setActiveMethod('personas')}
            className={`py-2 px-1 uppercase font-bold transition-colors ${
              activeMethod === 'personas'
                ? 'bg-[#f4f0e6] text-[#0c0d10]'
                : 'bg-[#12141c] text-[#a39e93] hover:text-[#f4f0e6]'
            }`}
          >
            PERSONAS
          </button>
        </div>

        {/* Method 1: Official Telegram Login Widget */}
        {activeMethod === 'widget' && (
          <div className="flex flex-col items-center gap-3 w-full py-5 px-4 bg-[#0c0d10] border border-[#262936]">
            <span className="text-[11px] font-bold text-[#f4f0e6] uppercase">
              [ TELEGRAM OIDC AUTHENTICATION ]
            </span>
            <p className="text-[11px] text-[#a39e93] font-sans">
              Authenticates securely via Telegram HMAC-SHA256 signature with @{botUsername}.
            </p>
            <div ref={telegramContainerRef} className="min-h-[44px] flex items-center justify-center my-1" />
            <span className="text-[9px] text-[#6b665c]">
              Requires domain registered with @BotFather (/setdomain)
            </span>
          </div>
        )}

        {/* Method 2: Direct Bot Summon */}
        {activeMethod === 'bot' && (
          <div className="flex flex-col items-center gap-3 w-full py-5 px-4 bg-[#0c0d10] border border-[#262936]">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#d97706] uppercase">
              <Bot className="w-4 h-4" />
              <span>[ 1-CLICK BOT HANDSHAKE ]</span>
            </div>
            <p className="text-[11px] text-[#a39e93] font-sans">
              Launch @{botUsername} in Telegram to grant instant session access without browser redirect cookies.
            </p>

            {isRequestingToken ? (
              <Loader2 className="w-5 h-5 animate-spin text-[#d97706]" />
            ) : botDeepLink ? (
              <div className="w-full flex flex-col items-center gap-2">
                <a
                  href={botDeepLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="stamp-btn !bg-[#d97706] !text-black !border-[#d97706] hover:!bg-[#f4f0e6] w-full flex items-center justify-center gap-2 !py-2.5 text-xs font-bold"
                >
                  <Bot className="w-4 h-4" />
                  <span>OPEN @{botUsername}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </a>

                <div className="flex items-center gap-2 text-[10px] text-[#a39e93] animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-[#d97706]" />
                  <span>AWAITING TELEGRAM AUTHORIZATION...</span>
                </div>
              </div>
            ) : (
              <button
                onClick={handleRequestBotToken}
                className="stamp-btn text-xs !py-2 px-4"
              >
                GENERATE LOGIN LINK
              </button>
            )}
          </div>
        )}

        {/* Method 3: One-click Instant Personas */}
        {activeMethod === 'personas' && (
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
        )}

        {/* Security Notice */}
        <div className="text-[10px] text-[#6b665c] border-t border-[#262936] pt-4 w-full flex items-center justify-between">
          <span>HTTPONLY JWT ENCRYPTION</span>
          <span>EST. 2026 DISPATCH</span>
        </div>
      </div>
    </div>
  );
}
