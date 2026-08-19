'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, RealtimeEvent } from '@/lib/types';

// ─── AUTH CONTEXT ───────────────────────────────────────────────
interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginDemo: (persona: 'admin' | 'reader' | 'vip') => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  loginDemo: async () => {},
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

// ─── ROOT PROVIDERS COMPONENT ───────────────────────────────────
export function Providers({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [listeners] = useState<Set<RealtimeCallback>>(new Set());

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
    <AuthContext.Provider value={{ user, loading, loginDemo, logout, refreshUser }}>
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
  );
}
