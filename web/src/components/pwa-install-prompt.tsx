'use client';

import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Share } from 'lucide-react';

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already in standalone mode
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    ) {
      setIsStandalone(true);
      return;
    }

    // Register service worker if supported
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[PWA] ServiceWorker registered with scope:', reg.scope);
        })
        .catch((err) => {
          console.warn('[PWA] ServiceWorker registration error:', err);
        });
    }

    // iOS detection
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Chrome/Android PWA install prompt handler
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // If iOS and not standalone, show prompt after 3s delay
    if (isIosDevice && !(window.navigator as any).standalone) {
      const timer = setTimeout(() => setShowPrompt(true), 3000);
      return () => clearTimeout(timer);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  if (isStandalone || !showPrompt) return null;

  return (
    <div className="fixed bottom-20 lg:bottom-6 left-4 right-4 sm:left-6 sm:right-auto sm:max-w-sm z-50 bg-[#12141c] border-2 border-[#3d4257] p-4 shadow-[6px_6px_0px_0px_#000000] font-teletype animate-in slide-in-from-bottom-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 border-2 border-[#f4f0e6] bg-[#f4f0e6] text-[#0c0d10] flex items-center justify-center font-bold text-sm shrink-0">
            §
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-bold text-xs text-[#f4f0e6] uppercase">
              Install Dispatch App
            </span>
            <span className="text-[10px] text-[#a39e93] leading-tight">
              {isIOS
                ? 'Tap Share ⎙ → "Add to Home Screen" for the full offline broadsheet'
                : 'Install as desktop or mobile PWA for instant dispatches'}
            </span>
          </div>
        </div>

        <button
          onClick={() => setShowPrompt(false)}
          className="p-1 border border-[#262936] text-[#a39e93] hover:text-[#f4f0e6] transition-colors shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="mt-3 flex items-center gap-2">
        {isIOS ? (
          <div className="w-full text-center py-1 px-2 bg-[#171a24] border border-[#262936] text-[10px] text-[#d6d0c2] font-semibold">
            Press <Share className="w-3 h-3 inline mx-1" /> then [ Add to Home Screen ]
          </div>
        ) : (
          <button
            onClick={handleInstall}
            className="stamp-btn w-full !text-xs !py-1.5 flex items-center justify-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>INSTALL PWA</span>
          </button>
        )}
      </div>
    </div>
  );
}
