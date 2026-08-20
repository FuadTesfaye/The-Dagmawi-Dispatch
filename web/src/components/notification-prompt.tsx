'use client';

import React, { useState } from 'react';
import { useNotificationPermission, showLocalNotification } from '@/lib/notifications';
import { useToast } from './providers';
import { Bell, BellRing, BellOff, Loader2, Sparkles, Check } from 'lucide-react';

export function NotificationPromptBanner() {
  const { isSupported, permission, isGranted, isDenied, request } = useNotificationPermission();
  const { showToast } = useToast();
  const [isRequesting, setIsRequesting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  if (!isSupported) return null;

  const handleEnable = async () => {
    setIsRequesting(true);
    try {
      const res = await request();
      if (res === 'granted') {
        showToast('Royal telegraph notifications activated!', 'success');
        showLocalNotification('✦ Telegraph Notifications Activated', {
          body: 'You will now receive breaking bulletins from monitored publications.',
        });
      } else if (res === 'denied') {
        showToast('Notification permission was blocked in browser settings', 'error');
      }
    } catch {
      showToast('Failed to request permission', 'error');
    } finally {
      setIsRequesting(false);
    }
  };

  const handleSendTest = async () => {
    setIsTesting(true);
    try {
      await showLocalNotification('✦ ROYAL BULLETIN #2026', {
        body: 'Breaking: Telegram autonomous intelligence engine synced with sovereign broadsheet wires.',
        icon: 'https://api.dicebear.com/7.x/bottts/svg?seed=dagmawi_babi',
      });
      showToast('Sent test notification to your system tray!', 'success');
    } catch {
      showToast('Error displaying notification', 'error');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="broadsheet-card p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 font-teletype">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 border-2 flex items-center justify-center rounded-sm shrink-0 ${
          isGranted
            ? 'border-emerald-500/60 bg-emerald-950/40 text-emerald-400'
            : isDenied
            ? 'border-red-500/60 bg-red-950/40 text-red-400'
            : 'border-[#d97706]/60 bg-[#241c10]/40 text-[#d97706]'
        }`}>
          {isGranted ? (
            <BellRing className="w-5 h-5 animate-pulse" />
          ) : isDenied ? (
            <BellOff className="w-5 h-5" />
          ) : (
            <Bell className="w-5 h-5" />
          )}
        </div>

        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs sm:text-sm text-[var(--paper-cream)] uppercase">
              {isGranted ? 'Telegraph Wire Notifications Active' : 'Breaking Dispatch Bulletins'}
            </span>
            <span className={`text-[9px] font-bold px-1.5 py-0.2 border uppercase ${
              isGranted
                ? 'text-emerald-400 border-emerald-500/40'
                : isDenied
                ? 'text-red-400 border-red-500/40'
                : 'text-[#d97706] border-[#d97706]/40'
            }`}>
              {permission.toUpperCase()}
            </span>
          </div>
          <p className="text-xs text-[var(--paper-muted)] font-sans leading-relaxed">
            {isGranted
              ? 'Your device receives real-time broadcasts when tracked channels transmit dispatches.'
              : isDenied
              ? 'Notifications are blocked. Click the lock icon in your browser URL bar to allow.'
              : 'Enable desktop & mobile notifications to receive real-time updates on breaking publications.'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--ink-border)]">
        {isGranted ? (
          <button
            onClick={handleSendTest}
            disabled={isTesting}
            className="stamp-btn !py-2 !px-3 text-xs flex items-center justify-center gap-1.5 active:scale-95 w-full sm:w-auto"
          >
            {isTesting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-[#d97706]" />
            )}
            <span>TEST NOTIFICATION</span>
          </button>
        ) : isDenied ? (
          <span className="text-[10px] text-red-400 font-bold uppercase">
            BLOCKED BY BROWSER
          </span>
        ) : (
          <button
            onClick={handleEnable}
            disabled={isRequesting}
            className="stamp-btn !bg-[#d97706] !text-black !border-[#d97706] hover:!bg-[var(--paper-cream)] !py-2 !px-4 text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 w-full sm:w-auto shadow-[3px_3px_0px_0px_var(--shadow-color)]"
          >
            {isRequesting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>REQUESTING...</span>
              </>
            ) : (
              <>
                <Bell className="w-3.5 h-3.5" />
                <span>ENABLE NOTIFICATIONS</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
