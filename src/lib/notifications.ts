'use client';

import { useState, useEffect } from 'react';

const EVENT_NAME = 'lurkening_notification_permission_changed';

/** Check if Notifications & Service Workers are supported */
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
}

/** Get current notification permission state */
export function getNotificationPermission(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'default';
  return Notification.permission;
}

/** Register the PWA service worker */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;

  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    return reg;
  } catch (err) {
    console.warn('[PWA] Service worker registration failed:', err);
    return null;
  }
}

/** Request notification permission from user */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) return 'denied';

  try {
    const permission = await Notification.requestPermission();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { permission } }));
    }

    if (permission === 'granted') {
      await registerServiceWorker();
    }
    return permission;
  } catch (err) {
    console.error('[Notifications] Permission request error:', err);
    return 'denied';
  }
}

/** Trigger an immediate local dispatch notification */
export async function showLocalNotification(title: string, options?: NotificationOptions) {
  if (!isNotificationSupported()) return;

  const defaultOptions: NotificationOptions = {
    body: 'Breaking intelligence received on the telegraph wire.',
    icon: 'https://api.dicebear.com/7.x/bottts/svg?seed=lurkening_bot',
    badge: 'https://api.dicebear.com/7.x/bottts/svg?seed=badge',
    ...options,
  };

  // Mobile haptic vibration if supported
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate([100, 50, 100]);
  }

  if (Notification.permission === 'granted') {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && 'showNotification' in reg) {
        await reg.showNotification(title, defaultOptions);
      } else {
        new Notification(title, defaultOptions);
      }
    } catch {
      new Notification(title, defaultOptions);
    }
  } else if (Notification.permission === 'default') {
    const perm = await requestNotificationPermission();
    if (perm === 'granted') {
      showLocalNotification(title, options);
    }
  }
}

/** React hook to track notification permission state */
export function useNotificationPermission() {
  const [permission, setPermission] = useState<NotificationPermission>(() => getNotificationPermission());

  useEffect(() => {
    setPermission(getNotificationPermission());

    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.permission) {
        setPermission(detail.permission);
      } else {
        setPermission(getNotificationPermission());
      }
    };

    window.addEventListener(EVENT_NAME, handler);
    return () => window.removeEventListener(EVENT_NAME, handler);
  }, []);

  const request = async () => {
    const res = await requestNotificationPermission();
    setPermission(res);
    return res;
  };

  return {
    isSupported: isNotificationSupported(),
    permission,
    isGranted: permission === 'granted',
    isDenied: permission === 'denied',
    request,
  };
}
