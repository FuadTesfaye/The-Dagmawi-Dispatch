'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, RealtimeEvent } from '@/lib/types';

// ─── AUTH CONTEXT ───────────────────────────────────────────────
interface AuthContextType {
  user: User | null;
  loading: boolean;
  isTelegramWebApp: boolean;
  loginDemo: (persona: 'admin' | 'reader' | 'vip') => Promise<void>;
  loginWithHandle: (username: string, displayName?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  triggerHaptic: (style?: 'light' | 'medium' | 'heavy' | 'selection') => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isTelegramWebApp: false,
  loginDemo: async () => {},
  loginWithHandle: async () => false,
  logout: async () => {},
  refreshUser: async () => {},
  triggerHaptic: () => {},
});

export const useAuth = () => useContext(AuthContext);

// ─── TOAST CONTEXT ──────────────────────────────────────────────
interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
});

export const useToast = () => useContext(ToastContext);

// ─── REALTIME CONTEXT ───────────────────────────────────────────
type RealtimeCallback = (event: RealtimeEvent) => void;

interface RealtimeContextType {
  isConnected: boolean;
  subscribe: (callback: RealtimeCallback) => () => void;
}

const RealtimeContext = createContext<RealtimeContextType>({
  isConnected: false,
  subscribe: () => () => {},
});

export const useRealtime = () => useContext(RealtimeContext);

// ─── THEME CONTEXT ───────────────────────────────────────────────
export type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  toggleTheme: () => {},
  setTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

// ─── ROOT PROVIDERS COMPONENT ───────────────────────────────────
export function Providers({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [listeners] = useState<Set<RealtimeCallback>>(new Set());
  const [isTelegramWebApp, setIsTelegramWebApp] = useState(false);

  // Initialize theme from localStorage / system preference
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('broadsheet_theme') as Theme | null;
      if (savedTheme === 'light' || savedTheme === 'dark') {
        setThemeState(savedTheme);
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(savedTheme);
      } else {
        const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
        const initialTheme: Theme = prefersLight ? 'light' : 'dark';
        setThemeState(initialTheme);
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(initialTheme);
      }
    } catch {}
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem('broadsheet_theme', newTheme);
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(newTheme);
    } catch {}
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem('broadsheet_theme', next);
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(next);
      } catch {}
      return next;
    });
  }, []);

  const triggerHaptic = useCallback((style: 'light' | 'medium' | 'heavy' | 'selection' = 'light') => {
    if (typeof window === 'undefined') return;
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.HapticFeedback) {
      if (style === 'selection') {
        tg.HapticFeedback.selectionChanged();
      } else {
        tg.HapticFeedback.impactOccurred(style);
      }
    } else if ('vibrate' in navigator) {
      navigator.vibrate(style === 'heavy' ? 40 : style === 'medium' ? 25 : 15);
    }
  }, []);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-authenticate & initialize Telegram WebApp when inside Telegram
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const tg = (window as any).Telegram?.WebApp;
    if (tg && tg.initData) {
      setIsTelegramWebApp(true);
      tg.ready();
      tg.expand?.();

      fetch('/api/auth/telegram-webapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: tg.initData }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data?.user) {
            setUser(data.user);
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      refreshUser();
    }
  }, [refreshUser]);

  const loginWithHandle = async (username: string, displayName?: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/handle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, displayName }),
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        showToast(`Signed in as ${data.user.displayName}`, 'success');
        return true;
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || 'Failed to authenticate', 'error');
        return false;
      }
    } catch {
      showToast('Network error during login', 'error');
      return false;
    }
  };

  const loginDemo = async (persona: 'admin' | 'reader' | 'vip') => {
    try {
      const res = await fetch('/api/auth/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ persona }),
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        showToast(`Welcome, ${data.user.displayName}!`, 'success');
      }
    } catch {
      showToast('Failed to sign in demo session', 'error');
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/me', { method: 'POST' });
      setUser(null);
      showToast('Signed out', 'info');
    } catch {
      showToast('Logout error', 'error');
    }
  };

  // Real-time SSE listener
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout;

    const connect = () => {
      eventSource = new EventSource('/api/realtime/sse');

      eventSource.onopen = () => {
        setIsConnected(true);
      };

      eventSource.onmessage = (event) => {
        try {
          const payload: RealtimeEvent = JSON.parse(event.data);
          listeners.forEach((callback) => callback(payload));
        } catch (e) {
          console.error('[Realtime SSE] Error parsing payload:', e);
        }
      };

      eventSource.onerror = () => {
        setIsConnected(false);
        if (eventSource) {
          eventSource.close();
        }
        reconnectTimeout = setTimeout(connect, 4000);
      };
    };

    connect();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      clearTimeout(reconnectTimeout);
    };
  }, [listeners]);

  const subscribe = useCallback(
    (callback: RealtimeCallback) => {
      listeners.add(callback);
      return () => {
        listeners.delete(callback);
      };
    },
    [listeners]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isTelegramWebApp,
        loginDemo,
        loginWithHandle,
        logout,
        refreshUser,
        triggerHaptic,
      }}
    >
      <ToastContext.Provider value={{ showToast }}>
        <RealtimeContext.Provider value={{ isConnected, subscribe }}>
          <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
            {children}

            {/* Clean Toast Notification Deck */}
            <div
              aria-live="polite"
              className="fixed bottom-[max(5.5rem,calc(env(safe-area-inset-bottom)+4.5rem))] lg:bottom-5 right-4 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full"
            >
              {toasts.map((toast) => (
                <div
                  key={toast.id}
                  className={`pointer-events-auto px-4 py-2.5 rounded-sm shadow-lg font-teletype text-xs border transition-all animate-in slide-in-from-bottom-2 flex items-center justify-between gap-3 ${
                    toast.type === 'error'
                      ? 'bg-rose-950/90 text-rose-200 border-rose-600/70'
                      : toast.type === 'success'
                      ? 'bg-emerald-950/90 text-emerald-200 border-emerald-600/70'
                      : 'bg-zinc-900/95 text-zinc-200 border-zinc-700'
                  }`}
                >
                  <span className="leading-snug">{toast.message}</span>
                </div>
              ))}
            </div>
          </ThemeContext.Provider>
        </RealtimeContext.Provider>
      </ToastContext.Provider>
    </AuthContext.Provider>
  );
}
