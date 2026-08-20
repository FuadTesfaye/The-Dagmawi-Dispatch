'use client';

import React, { useState, useEffect } from 'react';
import { Smartphone, Download, QrCode, Sparkles, ShieldCheck, CheckCircle2, ArrowDown, Bell, Laptop, Radio, ArrowUpRight, Share2, Layers } from 'lucide-react';
import { useToast } from '@/components/providers';
import { NotificationPromptBanner } from '@/components/notification-prompt';
import Link from 'next/link';

export default function AppDownloadPage() {
  const { showToast } = useToast();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Detect PWA install prompt
  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      showToast('The Lurkening installed successfully!', 'success');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [showToast]);

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        showToast('Installing The Lurkening...', 'info');
      }
      setDeferredPrompt(null);
    } else {
      showToast('To install on iOS: Tap Share ⎙ → "Add to Home Screen"', 'info');
    }
  };

  const handleDownloadApk = () => {
    setIsDownloading(true);
    showToast('Starting Android APK download...', 'info');
    setTimeout(() => setIsDownloading(false), 3000);
    window.location.href = '/api/download/apk';
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-8 flex flex-col gap-6 sm:gap-8 font-teletype">
      {/* Masthead Header */}
      <div className="p-4 sm:p-8 bg-[var(--card-bg)] border-2 border-[var(--ink-border-heavy)] shadow-[4px_4px_0px_0px_var(--shadow-color)] sm:shadow-[6px_6px_0px_0px_var(--shadow-color)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6">
        <div className="flex flex-col gap-2 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 stamp-badge-gold stamp-badge text-[10px] sm:text-xs self-start">
            <Smartphone className="w-3.5 h-3.5" />
            <span>ROYAL APPLICATION REGISTRY · MOBILE SUITE</span>
          </div>
          <h1 className="font-broadsheet font-black text-2xl sm:text-4xl text-[var(--paper-cream)] tracking-tight uppercase">
            The Lurkening Mobile App
          </h1>
          <p className="text-xs sm:text-sm text-[var(--paper-muted)] leading-relaxed font-sans">
            Download the native Android APK package or install the sovereign Progressive Web App for instant Telegram feed intelligence, offline caching, and real-time push notifications.
          </p>
        </div>

        <div className="w-16 h-16 sm:w-20 sm:h-20 border-2 border-[var(--ink-border-heavy)] bg-[var(--paper-cream)] text-[var(--ink-bg)] flex items-center justify-center font-black font-broadsheet text-2xl sm:text-4xl shadow-[3px_3px_0px_0px_var(--shadow-color)] shrink-0">
          APK
        </div>
      </div>

      {/* Main Download Showcase Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        {/* Card 1: Native Android APK */}
        <div className="broadsheet-card p-5 sm:p-7 flex flex-col justify-between gap-5 border-2 border-[#d97706]/70 shadow-[6px_6px_0px_0px_var(--shadow-color)] relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-[#d97706] text-black text-[9px] font-bold px-3 py-1 uppercase font-teletype">
            RECOMMENDED FOR ANDROID
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 border-2 border-[#d97706] bg-[#241c10] flex items-center justify-center rounded-sm text-[#d97706]">
                <Smartphone className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <h2 className="font-broadsheet font-black text-xl sm:text-2xl text-[var(--paper-cream)] uppercase">
                  Android APK Package
                </h2>
                <span className="text-xs text-[#d97706] font-bold">Native Android App (Capacitor Engine)</span>
              </div>
            </div>

            <p className="text-xs text-[var(--paper-muted)] font-sans leading-relaxed">
              Standalone installable application for all Android phones and tablets. Features native telegraph push notifications, ultra-smooth 120Hz scrolling, and zero browser chrome.
            </p>

            {/* Package Metadata Ledger */}
            <div className="grid grid-cols-2 gap-2 text-[10px] bg-[var(--subtle-bg)] p-3 border border-[var(--ink-border)]">
              <div>
                <span className="text-[var(--paper-muted)] block">PACKAGE NAME:</span>
                <span className="font-bold text-[var(--paper-cream)] font-mono">com.lurkening.dispatch</span>
              </div>
              <div>
                <span className="text-[var(--paper-muted)] block">BUILD VERSION:</span>
                <span className="font-bold text-[var(--paper-cream)] font-mono">v1.0.0 (Build 2026.88)</span>
              </div>
              <div>
                <span className="text-[var(--paper-muted)] block">MINIMUM SYSTEM:</span>
                <span className="font-bold text-[var(--paper-cream)] font-mono">Android 8.0+ (Oreo - Android 15)</span>
              </div>
              <div>
                <span className="text-[var(--paper-muted)] block">SECURITY VERIFICATION:</span>
                <span className="font-bold text-emerald-400 font-mono">100% Virus-Free Signed</span>
              </div>
            </div>
          </div>

          {/* Download APK Action Button */}
          <button
            onClick={handleDownloadApk}
            disabled={isDownloading}
            className="stamp-btn !bg-[#d97706] !text-black !border-[#d97706] hover:!bg-[var(--paper-cream)] w-full flex items-center justify-center gap-2.5 !py-3.5 text-xs sm:text-sm font-bold active:scale-95 shadow-[4px_4px_0px_0px_var(--shadow-color)]"
          >
            <Download className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>DOWNLOAD NATIVE ANDROID APK (.APK)</span>
          </button>
        </div>

        {/* Card 2: Progressive Web App (PWA) */}
        <div className="broadsheet-card p-5 sm:p-7 flex flex-col justify-between gap-5 shadow-[6px_6px_0px_0px_var(--shadow-color)]">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 border-2 border-[var(--ink-border)] bg-[var(--subtle-bg)] flex items-center justify-center rounded-sm text-[var(--paper-cream)]">
                <Laptop className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <h2 className="font-broadsheet font-black text-xl sm:text-2xl text-[var(--paper-cream)] uppercase">
                  Progressive Web App
                </h2>
                <span className="text-xs text-[var(--paper-muted)] font-bold">iOS Safari · Chrome · Edge · macOS</span>
              </div>
            </div>

            <p className="text-xs text-[var(--paper-muted)] font-sans leading-relaxed">
              Zero download size required. Installs directly to your home screen or dock in 1 second with offline broadsheet caching and instantaneous loading.
            </p>

            {/* Features List */}
            <div className="flex flex-col gap-1.5 text-xs font-sans text-[var(--paper-cream)] bg-[var(--subtle-bg)] p-3 border border-[var(--ink-border)]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Works on iOS, iPadOS, Windows, macOS, and Linux</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Automatic background updates — always running the latest dispatches</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Fast 0ms cache with offline article reading</span>
              </div>
            </div>
          </div>

          {/* PWA Action Button */}
          {isInstalled ? (
            <div className="p-3 bg-emerald-950/40 border border-emerald-500/50 flex items-center justify-center gap-2 text-emerald-300 text-xs font-bold uppercase">
              <CheckCircle2 className="w-4 h-4" />
              <span>APPLICATION ALREADY INSTALLED</span>
            </div>
          ) : (
            <button
              onClick={handleInstallPWA}
              className="stamp-btn w-full flex items-center justify-center gap-2 !py-3.5 text-xs sm:text-sm font-bold active:scale-95"
            >
              <Share2 className="w-4 h-4" />
              <span>ADD TO HOME SCREEN / INSTALL PWA</span>
            </button>
          )}
        </div>
      </div>

      {/* Notification Controller Section */}
      <NotificationPromptBanner />

      {/* Sideloading Instructions */}
      <div className="broadsheet-card p-5 sm:p-8 flex flex-col gap-4 shadow-[4px_4px_0px_0px_var(--shadow-color)]">
        <div className="flex items-center gap-2 border-b border-[var(--ink-border)] pb-2.5">
          <ShieldCheck className="w-4 h-4 text-[#d97706]" />
          <h3 className="font-bold text-xs sm:text-sm text-[var(--paper-cream)] uppercase">
            How to Install the APK on Android (3 Quick Steps)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-sans">
          <div className="p-3 bg-[var(--subtle-bg)] border border-[var(--ink-border)] flex flex-col gap-1.5">
            <span className="font-teletype font-bold text-[#d97706] text-sm">[ STEP 1 ]</span>
            <span className="font-bold text-[var(--paper-cream)]">Download the APK file</span>
            <p className="text-[var(--paper-muted)] leading-relaxed">
              Click the gold button above to download <code className="font-mono text-[#d97706]">the-lurkening.apk</code> to your device.
            </p>
          </div>

          <div className="p-3 bg-[var(--subtle-bg)] border border-[var(--ink-border)] flex flex-col gap-1.5">
            <span className="font-teletype font-bold text-[#d97706] text-sm">[ STEP 2 ]</span>
            <span className="font-bold text-[var(--paper-cream)]">Allow Unknown Sources</span>
            <p className="text-[var(--paper-muted)] leading-relaxed">
              When prompted by your browser, tap <strong>Settings</strong> and switch on <em>&quot;Allow from this source&quot;</em>.
            </p>
          </div>

          <div className="p-3 bg-[var(--subtle-bg)] border border-[var(--ink-border)] flex flex-col gap-1.5">
            <span className="font-teletype font-bold text-[#d97706] text-sm">[ STEP 3 ]</span>
            <span className="font-bold text-[var(--paper-cream)]">Install and Launch</span>
            <p className="text-[var(--paper-muted)] leading-relaxed">
              Tap <strong>Install</strong>. Once complete, launch <strong>The Lurkening</strong> from your home screen!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
