'use client';

import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { Sparkles, Download, RefreshCw, X, ArrowUpRight, CheckCircle2, ShieldAlert } from 'lucide-react';

export interface AppVersionInfo {
  appName: string;
  appId: string;
  version: string;
  buildCode: number;
  buildName: string;
  releaseDate: string;
  title: string;
  notes: string[];
  apkDownloadUrl: string;
  apkSize: string;
  minSupportedVersion: string;
  mandatoryUpdate?: boolean;
}

// Current client built-in baseline version
export const CURRENT_CLIENT_VERSION = '1.0.0';
export const CURRENT_CLIENT_BUILD = 202688;

interface AppUpdateContextType {
  isUpdateAvailable: boolean;
  updateInfo: AppVersionInfo | null;
  checking: boolean;
  lastChecked: Date | null;
  isStandalone: boolean;
  isNativeAndroid: boolean;
  checkForUpdates: (silent?: boolean) => Promise<boolean>;
  applyUpdate: () => void;
  dismissUpdate: () => void;
}

const AppUpdateContext = createContext<AppUpdateContextType>({
  isUpdateAvailable: false,
  updateInfo: null,
  checking: false,
  lastChecked: null,
  isStandalone: false,
  isNativeAndroid: false,
  checkForUpdates: async () => false,
  applyUpdate: () => {},
  dismissUpdate: () => {},
});

export const useAppUpdate = () => useContext(AppUpdateContext);

export function AppUpdateProvider({ children }: { children: React.ReactNode }) {
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<AppVersionInfo | null>(null);
  const [checking, setChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isNativeAndroid, setIsNativeAndroid] = useState(false);

  // Detect runtime environment (Standalone PWA or Android Native Capacitor)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isStand =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(isStand);

    const ua = window.navigator.userAgent.toLowerCase();
    const isAndroid = /android/.test(ua);
    const hasCapacitor = (window as any).Capacitor?.isNativePlatform?.() || false;
    setIsNativeAndroid(isAndroid || hasCapacitor);
  }, []);

  // Check remote version API and ServiceWorker
  const checkForUpdates = useCallback(async (silent = false): Promise<boolean> => {
    if (typeof window === 'undefined') return false;
    setChecking(true);

    try {
      // 1. Check ServiceWorker registration update
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          try {
            await reg.update();
          } catch (swErr) {
            console.debug('[PWA Update] SW update check debug:', swErr);
          }
          if (reg.waiting) {
            setWaitingWorker(reg.waiting);
            setIsUpdateAvailable(true);
          }
        }
      }

      // 2. Query Version API
      const res = await fetch(`/api/app/version?_t=${Date.now()}`, {
        cache: 'no-store',
      });

      if (res.ok) {
        const data: AppVersionInfo = await res.json();
        setUpdateInfo(data);
        setLastChecked(new Date());

        // Compare build code or version
        const isNewer = data.buildCode > CURRENT_CLIENT_BUILD || data.version !== CURRENT_CLIENT_VERSION;
        if (isNewer || waitingWorker) {
          setIsUpdateAvailable(true);
          // Check if previously dismissed in this session
          const dismissedBuild = sessionStorage.getItem('dismissed_update_build');
          if (dismissedBuild === String(data.buildCode) && !data.mandatoryUpdate && !silent) {
            // Keep update available state for manual checker, but let prompt respect dismissal
          } else if (dismissedBuild !== String(data.buildCode)) {
            setIsDismissed(false);
          }
          return true;
        } else {
          if (!waitingWorker) {
            setIsUpdateAvailable(false);
          }
          return false;
        }
      }
      return false;
    } catch (err) {
      console.warn('[AppUpdate] Failed to fetch version info:', err);
      return false;
    } finally {
      setChecking(false);
    }
  }, [waitingWorker]);

  // Listen for ServiceWorker update events
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const onControllerChange = () => {
      // Reload when new SW takes control
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    navigator.serviceWorker.ready.then((registration) => {
      // Check if a worker is already waiting
      if (registration.waiting) {
        setWaitingWorker(registration.waiting);
        setIsUpdateAvailable(true);
      }

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New content is available once current worker is updated
            setWaitingWorker(newWorker);
            setIsUpdateAvailable(true);
            setIsDismissed(false);
          }
        });
      });
    });

    // Initial check
    checkForUpdates(true);

    // Periodic check every 15 minutes
    const interval = setInterval(() => checkForUpdates(true), 15 * 60 * 1000);

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      clearInterval(interval);
    };
  }, [checkForUpdates]);

  const applyUpdate = useCallback(() => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    } else if (isNativeAndroid && updateInfo?.apkDownloadUrl) {
      window.location.href = updateInfo.apkDownloadUrl;
    } else {
      window.location.reload();
    }
  }, [waitingWorker, isNativeAndroid, updateInfo]);

  const dismissUpdate = useCallback(() => {
    setIsDismissed(true);
    if (updateInfo?.buildCode) {
      sessionStorage.setItem('dismissed_update_build', String(updateInfo.buildCode));
    }
  }, [updateInfo]);

  return (
    <AppUpdateContext.Provider
      value={{
        isUpdateAvailable,
        updateInfo,
        checking,
        lastChecked,
        isStandalone,
        isNativeAndroid,
        checkForUpdates,
        applyUpdate,
        dismissUpdate,
      }}
    >
      {children}
      {isUpdateAvailable && !isDismissed && (
        <AppUpdateBanner
          updateInfo={updateInfo}
          onApply={applyUpdate}
          onDismiss={dismissUpdate}
          isNativeAndroid={isNativeAndroid}
        />
      )}
    </AppUpdateContext.Provider>
  );
}

// ─── TACTILE APP UPDATE BANNER POP-UP ─────────────────────────
interface AppUpdateBannerProps {
  updateInfo: AppVersionInfo | null;
  onApply: () => void;
  onDismiss: () => void;
  isNativeAndroid: boolean;
}

function AppUpdateBanner({ updateInfo, onApply, onDismiss, isNativeAndroid }: AppUpdateBannerProps) {
  const version = updateInfo?.version || '1.0.1';
  const build = updateInfo?.buildName || '2026.89';
  const notes = updateInfo?.notes || [
    'Performance enhancements and fresh telegraph wire dispatches',
    'Responsive navigation updates with safe-area padding',
  ];

  return (
    <aside
      aria-label="Application Update Notice"
      className="fixed bottom-[max(5.5rem,calc(env(safe-area-inset-bottom)+4.5rem))] lg:bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-50 bg-[var(--card-bg)] border-2 border-[#d97706] p-4 sm:p-5 shadow-[6px_6px_0px_0px_var(--shadow-color)] font-teletype animate-in slide-in-from-bottom-5 duration-250 transition-all text-[var(--paper-cream)]"
    >
      {/* Header with Royal Badge and Dismiss */}
      <div className="flex items-start justify-between gap-3 border-b border-[var(--ink-border)] pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 border border-[#d97706] bg-[#241c10] text-[#d97706] flex items-center justify-center font-bold text-xs shrink-0 animate-pulse">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-[#d97706] tracking-wider uppercase">
              ✦ ROYAL DISPATCH WIRE UPDATE
            </span>
            <h4 className="font-broadsheet font-black text-sm text-[var(--paper-cream)] uppercase tracking-tight">
              Edition {version} Available
            </h4>
          </div>
        </div>

        <button
          onClick={onDismiss}
          className="p-1 border border-[var(--ink-border)] text-[var(--paper-muted)] hover:text-[var(--paper-cream)] hover:bg-[var(--subtle-bg)] transition-colors active:scale-95 shrink-0"
          aria-label="Dismiss update reminder"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Body: Changelog & Build info */}
      <div className="py-2.5 flex flex-col gap-1.5 font-sans text-xs">
        <div className="flex items-center justify-between text-[10px] font-teletype text-[var(--paper-muted)]">
          <span>BUILD: <span className="text-[var(--paper-cream)] font-mono">{build}</span></span>
          <span className="text-emerald-400 font-bold">READY TO DEPLOY</span>
        </div>

        <ul className="flex flex-col gap-1 text-[11px] text-[var(--paper-muted)] mt-1">
          {notes.slice(0, 2).map((note, idx) => (
            <li key={idx} className="flex items-start gap-1.5">
              <span className="text-[#d97706] font-bold shrink-0">›</span>
              <span className="leading-tight">{note}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Action Buttons */}
      <div className="mt-2.5 pt-2 border-t border-[var(--ink-border)] flex items-center gap-2">
        <button
          onClick={onApply}
          className="stamp-btn flex-1 !bg-[#d97706] !text-black !border-[#d97706] hover:!bg-[var(--paper-cream)] !py-2 text-xs font-bold active:scale-95 shadow-[2px_2px_0px_0px_var(--shadow-color)]"
        >
          {isNativeAndroid ? (
            <>
              <Download className="w-3.5 h-3.5" />
              <span>DOWNLOAD APK UPDATE</span>
            </>
          ) : (
            <>
              <RefreshCw className="w-3.5 h-3.5" />
              <span>RELOAD & UPDATE APP</span>
            </>
          )}
        </button>

        <button
          onClick={onDismiss}
          className="stamp-btn !py-2 !px-3 text-xs text-[var(--paper-muted)] hover:text-[var(--paper-cream)] active:scale-95"
        >
          LATER
        </button>
      </div>
    </aside>
  );
}
