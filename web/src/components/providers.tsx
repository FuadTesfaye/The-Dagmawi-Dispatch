'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, RealtimeEvent } from '@/lib/types';

// ─── AUTH CONTEXT ───────────────────────────────────────────────
interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginDemo: (persona: 'admin' | 'reader' | 'vip') => Promise<void>;
  loginWithHandle: (username: string, displayName?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  loginDemo: async () => {},
  loginWithHandle: async () => false,
  logout: async () => {},
  refreshUser: async () => {},
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

  useEffect(() => {
    refreshUser();
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
        showToast(`Entered archive as ${data.user.displayName}`, 'success');
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
    } catch (err) {
      showToast('Failed to sign in demo session', 'error');
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/me', { method: 'POST' });
      setUser(null);
      showToast('Signed out of the realm', 'info');
    } catch (err) {
      showToast('Logout error', 'error');
    }
  };

  // Real-time SSE listener
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const connectSSE = () => {
      eventSource = new EventSource('/api/realtime/sse');

      eventSource.addEventListener('connected', () => {
        setIsConnected(true);
      });

      eventSource.addEventListener('message', (e) => {
        try {
          const event = JSON.parse(e.data) as RealtimeEvent;
          listeners.forEach((fn) => fn(event));
        } catch {
          // Ignored
        }
      });

      eventSource.onerror = () => {
        setIsConnected(false);
        if (eventSource) eventSource.close();
        reconnectTimeout = setTimeout(connectSSE, 5000);
      };
    };

    connectSSE();

    return () => {
      if (eventSource) eventSource.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [listeners]);

  const subscribeRealtime = useCallback(
    (callback: RealtimeCallback) => {
      listeners.add(callback);
      return () => {
        listeners.delete(callback);
      };
    },
    [listeners]
  );

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      <AuthContext.Provider value={{ user, loading, loginDemo, loginWithHandle, logout, refreshUser }}>
        <ToastContext.Provider value={{ showToast }}>
          <RealtimeContext.Provider value={{ isConnected, subscribe: subscribeRealtime }}>
            {children}

            {/* Floating Toast Notification Stack */}
            <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
              {toasts.map((t) => (
                <div
                  key={t.id}
                  className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium shadow-2xl backdrop-blur-xl border transition-all duration-300 animate-in slide-in-from-bottom-2 ${
                    t.type === 'success'
                      ? 'bg-amber-950/90 text-amber-200 border-amber-500/40'
                      : t.type === 'error'
                      ? 'bg-rose-950/90 text-rose-200 border-rose-500/40'
                      : 'bg-zinc-900/90 text-zinc-200 border-zinc-700/40'
                  }`}
                >
                  <span>{t.type === 'success' ? '👑' : t.type === 'error' ? '⚠️' : '📜'}</span>
                  <span>{t.message}</span>
                </div>
              ))}
            </div>
          </RealtimeContext.Provider>
        </ToastContext.Provider>
      </AuthContext.Provider>
    </ThemeContext.Provider>
  );
}
