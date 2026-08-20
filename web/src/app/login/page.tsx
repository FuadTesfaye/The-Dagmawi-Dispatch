'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth, useToast } from '@/components/providers';
import { Bot, Loader2, ArrowUpRight, ShieldCheck, CheckCircle2, Phone, KeyRound, ArrowRight, RefreshCw } from 'lucide-react';
import { TELEGRAM_BOT_USERNAME } from '@/lib/constants';

export default function LoginPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Mode: 'phone' or 'bot'
  const [authTab, setAuthTab] = useState<'phone' | 'bot'>('phone');

  // Phone Auth State
  const [phoneStep, setPhoneStep] = useState<'enter_phone' | 'enter_code'>('enter_phone');
  const [phoneInput, setPhoneInput] = useState('0924113086');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [normalizedPhone, setNormalizedPhone] = useState<string>('');
  const [codeInput, setCodeInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [requires2FA, setRequires2FA] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);

  // Bot Deep Link State
  const [botToken, setBotToken] = useState<string | null>(null);
  const [botDeepLink, setBotDeepLink] = useState<string | null>(null);
  const [isRequestingBotToken, setIsRequestingBotToken] = useState(false);
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

  // 1. Initialize Bot Deep Link
  useEffect(() => {
    let isMounted = true;
    setIsRequestingBotToken(true);

    fetch('/api/auth/token-request', { method: 'POST' })
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.token) {
          setBotToken(data.token);
          setBotDeepLink(data.deepLink);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsRequestingBotToken(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Poll for Bot authorization
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

  // 3. Handle Send Phone Verification Code
  const handleSendCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!phoneInput.trim()) {
      showToast('Please enter your Telegram phone number', 'info');
      return;
    }

    setIsSendingCode(true);
    try {
      const res = await fetch('/api/auth/phone/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneInput.trim() }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSessionId(data.sessionId);
        setNormalizedPhone(data.phone);
        setPhoneStep('enter_code');
        showToast(`Official Telegram login code sent to ${data.phone}! Check your Telegram app.`, 'success');
      } else {
        showToast(data.error || 'Failed to send Telegram code', 'error');
      }
    } catch {
      showToast('Network error while requesting Telegram code', 'error');
    } finally {
      setIsSendingCode(false);
    }
  };

  // 4. Handle Verify Code & Sign In
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId || !codeInput.trim()) {
      showToast('Please enter the 5-digit Telegram code', 'info');
      return;
    }

    setIsVerifyingCode(true);
    try {
      const res = await fetch('/api/auth/phone/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          code: codeInput.trim(),
          password: passwordInput.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setAuthorizedUser(data.user?.displayName || data.user?.username || 'Telegram User');
        showToast(`Authenticated as ${data.user?.displayName || 'Scribe'}!`, 'success');
        setTimeout(() => {
          window.location.href = '/';
        }, 800);
      } else if (data.requires2FA) {
        setRequires2FA(true);
        showToast('Please enter your Telegram 2FA Cloud Password', 'info');
      } else {
        showToast(data.error || 'Invalid verification code', 'error');
      }
    } catch {
      showToast('Verification failed. Please try again.', 'error');
    } finally {
      setIsVerifyingCode(false);
    }
  };

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
            Log in directly with your <span className="text-[var(--paper-cream)] font-bold">Telegram Account</span> via phone verification code or 1-click bot authorization.
          </p>
        </div>

        {/* Success State Banner */}
        {authorizedUser ? (
          <div className="w-full p-4 bg-emerald-950/40 border-2 border-emerald-500/60 flex flex-col items-center gap-2 text-emerald-200 animate-in zoom-in-95">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            <span className="font-bold text-sm uppercase">IDENTITY CONFIRMED</span>
            <span className="text-xs text-emerald-300 font-sans">
              Welcome, {authorizedUser}! Entering the archive realm...
            </span>
          </div>
        ) : (
          <div className="w-full flex flex-col gap-4">
            {/* Method Tabs */}
            <div className="grid grid-cols-2 w-full border-2 border-[var(--ink-border)] text-xs">
              <button
                onClick={() => setAuthTab('phone')}
                className={`py-2.5 px-2 uppercase font-bold transition-colors flex items-center justify-center gap-2 active:scale-95 ${
                  authTab === 'phone'
                    ? 'bg-[var(--paper-cream)] text-[var(--ink-bg)]'
                    : 'bg-[var(--card-bg)] text-[var(--paper-muted)] hover:text-[var(--paper-cream)]'
                }`}
              >
                <Phone className="w-3.5 h-3.5" />
                <span>TELEGRAM PHONE CODE</span>
              </button>
              <button
                onClick={() => setAuthTab('bot')}
                className={`py-2.5 px-2 uppercase font-bold transition-colors border-l border-[var(--ink-border)] flex items-center justify-center gap-2 active:scale-95 ${
                  authTab === 'bot'
                    ? 'bg-[var(--paper-cream)] text-[var(--ink-bg)]'
                    : 'bg-[var(--card-bg)] text-[var(--paper-muted)] hover:text-[var(--paper-cream)]'
                }`}
              >
                <Bot className="w-3.5 h-3.5" />
                <span>1-CLICK BOT LINK</span>
              </button>
            </div>

            {/* ─── TAB 1: TELEGRAM PHONE CODE LOGIN ─── */}
            {authTab === 'phone' && (
              <div className="w-full flex flex-col gap-4 p-4 sm:p-5 bg-[var(--subtle-bg)] border-2 border-[var(--ink-border)] text-left">
                {phoneStep === 'enter_phone' ? (
                  <form onSubmit={handleSendCode} className="flex flex-col gap-3.5">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] uppercase font-bold text-[#d97706] tracking-wider">
                        TELEGRAM PHONE NUMBER *
                      </label>
                      <div className="relative flex items-center">
                        <Phone className="w-4 h-4 text-[var(--paper-muted)] absolute left-3" />
                        <input
                          type="tel"
                          value={phoneInput}
                          onChange={(e) => setPhoneInput(e.target.value)}
                          placeholder="0924113086 or +251 92 411 3086"
                          required
                          className="w-full pl-9 pr-3 py-2.5 bg-[var(--input-bg)] border border-[var(--ink-border)] text-[var(--paper-cream)] placeholder-[var(--paper-faint)] text-sm font-teletype uppercase focus:border-[#d97706] focus:outline-none"
                        />
                      </div>
                      <span className="text-[10px] text-[var(--paper-muted)] font-sans">
                        Telegram will send an official login code to your Telegram app.
                      </span>
                    </div>

                    <button
                      type="submit"
                      disabled={isSendingCode}
                      className="stamp-btn !bg-[#d97706] !text-black !border-[#d97706] hover:!bg-[var(--paper-cream)] w-full flex items-center justify-center gap-2 !py-2.5 text-xs font-bold active:scale-95 shadow-[3px_3px_0px_0px_var(--shadow-color)]"
                    >
                      {isSendingCode ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>SENDING TELEGRAM CODE...</span>
                        </>
                      ) : (
                        <>
                          <span>SEND TELEGRAM CODE</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  /* Step 2: Enter Verification Code */
                  <form onSubmit={handleVerifyCode} className="flex flex-col gap-3.5 animate-in fade-in">
                    <div className="p-2.5 bg-[var(--card-bg)] border border-[var(--ink-border)] flex items-center justify-between text-xs font-sans">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-[var(--paper-muted)]">Code sent to:</span>
                        <span className="font-mono font-bold text-[var(--paper-cream)]">{normalizedPhone}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setPhoneStep('enter_phone');
                          setCodeInput('');
                          setPasswordInput('');
                          setRequires2FA(false);
                        }}
                        className="text-[10px] text-[#d97706] hover:underline font-teletype font-bold uppercase"
                      >
                        [ EDIT ]
                      </button>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] uppercase font-bold text-[#d97706] tracking-wider">
                        ENTER 5-DIGIT TELEGRAM CODE *
                      </label>
                      <div className="relative flex items-center">
                        <KeyRound className="w-4 h-4 text-[var(--paper-muted)] absolute left-3" />
                        <input
                          type="text"
                          value={codeInput}
                          onChange={(e) => setCodeInput(e.target.value)}
                          placeholder="e.g. 12345"
                          maxLength={6}
                          autoFocus
                          required
                          className="w-full pl-9 pr-3 py-2.5 bg-[var(--input-bg)] border-2 border-[#d97706] text-[var(--paper-cream)] placeholder-[var(--paper-faint)] text-base font-mono tracking-widest uppercase focus:outline-none"
                        />
                      </div>
                      <span className="text-[10px] text-[var(--paper-muted)] font-sans">
                        Check the notification from Telegram on your phone or desktop.
                      </span>
                    </div>

                    {requires2FA && (
                      <div className="flex flex-col gap-1.5 animate-in fade-in">
                        <label className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                          2FA CLOUD PASSWORD (REQUIRED)
                        </label>
                        <input
                          type="password"
                          value={passwordInput}
                          onChange={(e) => setPasswordInput(e.target.value)}
                          placeholder="Your Telegram 2FA Password"
                          required
                          className="w-full px-3 py-2.5 bg-[var(--input-bg)] border border-amber-500/60 text-[var(--paper-cream)] placeholder-[var(--paper-faint)] text-sm font-sans focus:outline-none focus:border-amber-400"
                        />
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="submit"
                        disabled={isVerifyingCode}
                        className="stamp-btn !bg-[#d97706] !text-black !border-[#d97706] hover:!bg-[var(--paper-cream)] flex-1 flex items-center justify-center gap-2 !py-2.5 text-xs font-bold active:scale-95 shadow-[3px_3px_0px_0px_var(--shadow-color)]"
                      >
                        {isVerifyingCode ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>VERIFYING WITH TELEGRAM...</span>
                          </>
                        ) : (
                          <>
                            <span>VERIFY & ENTER ARCHIVE</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSendCode()}
                        disabled={isSendingCode}
                        className="stamp-btn !bg-[var(--card-bg)] !text-[var(--paper-muted)] hover:!text-[var(--paper-cream)] p-2.5"
                        title="Resend code"
                      >
                        <RefreshCw className={`w-4 h-4 ${isSendingCode ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* ─── TAB 2: 1-CLICK BOT LINK ─── */}
            {authTab === 'bot' && (
              <div className="p-4 sm:p-5 bg-[var(--subtle-bg)] border-2 border-[var(--ink-border)] flex flex-col items-center gap-3.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#d97706] uppercase tracking-wider">
                  <Bot className="w-4 h-4" />
                  <span>1-CLICK BOT HANDSHAKE</span>
                </div>

                {isRequestingBotToken ? (
                  <div className="py-6 flex flex-col items-center gap-2 text-[var(--paper-muted)] text-xs">
                    <Loader2 className="w-6 h-6 animate-spin text-[#d97706]" />
                    <span>GENERATING BOT TOKEN...</span>
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
                      <span>OPEN @{botUsername.toUpperCase()} IN TELEGRAM</span>
                      <ArrowUpRight className="w-4 h-4" />
                    </a>

                    <div className="w-full flex flex-col gap-1.5 text-left text-[11px] text-[var(--paper-muted)] font-sans border-t border-[var(--ink-border)] pt-2.5">
                      <div className="flex items-start gap-2">
                        <span className="font-bold text-[#d97706] font-teletype">[1]</span>
                        <span>Click the button above to launch @{botUsername} in Telegram.</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="font-bold text-[#d97706] font-teletype">[2]</span>
                        <span>Press <strong className="text-[var(--paper-cream)] font-mono">Start</strong> to authorize your web session.</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-[#d97706] pt-1">
                      <span className="w-2 h-2 rounded-full bg-[#d97706] animate-ping" />
                      <span className="font-bold uppercase tracking-wider">Awaiting your confirmation in Telegram...</span>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        )}

        {/* Security & Verification Footer */}
        <div className="text-[10px] text-[var(--paper-faint)] border-t border-[var(--ink-border)] pt-3 w-full flex items-center justify-between font-teletype">
          <div className="flex items-center gap-1.5 text-emerald-500">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>OFFICIAL TELEGRAM MTPROTO</span>
          </div>
          <span>HTTPONLY JWT</span>
        </div>
      </div>
    </div>
  );
}
