'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'lurkening_muted_channels';
const EVENT_NAME = 'lurkening_channel_mute_changed';

/** Retrieve currently muted channels from localStorage */
export function getLocalMutedChannels(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed.map((s: string) => s.toLowerCase()) : []);
  } catch {
    return new Set();
  }
}

/** Check if specific channel is muted */
export function isChannelMutedLocal(channelId: string): boolean {
  const set = getLocalMutedChannels();
  return set.has(channelId.toLowerCase().replace(/^@/, ''));
}

/** Toggle mute state with optimistic local storage and background server sync */
export async function toggleChannelMute(
  channelId: string,
  explicitState?: boolean
): Promise<boolean> {
  const cleanId = channelId.toLowerCase().replace(/^@/, '');
  const currentSet = getLocalMutedChannels();
  const nextState = explicitState !== undefined ? explicitState : !currentSet.has(cleanId);

  if (nextState) {
    currentSet.add(cleanId);
  } else {
    currentSet.delete(cleanId);
  }

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(currentSet)));
      window.dispatchEvent(
        new CustomEvent(EVENT_NAME, {
          detail: { channelId: cleanId, isMuted: nextState },
        })
      );
    } catch {}
  }

  // Background server sync
  try {
    fetch(`/api/channels/${cleanId}/mute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isMuted: nextState }),
    }).catch(() => {});
  } catch {}

  return nextState;
}

/** React hook for real-time channel mute state */
export function useChannelMute(channelId: string, initialMuted = false) {
  const cleanId = channelId.toLowerCase().replace(/^@/, '');
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const local = getLocalMutedChannels();
      if (local.size > 0) return local.has(cleanId);
    }
    return initialMuted;
  });

  useEffect(() => {
    // Initial sync
    const local = getLocalMutedChannels();
    if (local.has(cleanId) !== isMuted) {
      setIsMuted(local.has(cleanId));
    }

    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.channelId === cleanId) {
        setIsMuted(detail.isMuted);
      }
    };

    window.addEventListener(EVENT_NAME, handler);
    return () => window.removeEventListener(EVENT_NAME, handler);
  }, [cleanId, isMuted]);

  const toggle = useCallback(
    async (next?: boolean) => {
      const result = await toggleChannelMute(cleanId, next);
      setIsMuted(result);
      return result;
    },
    [cleanId]
  );

  return { isMuted, toggle };
}

/** React hook to get all muted channel IDs */
export function useAllMutedChannels() {
  const [mutedSet, setMutedSet] = useState<Set<string>>(() => getLocalMutedChannels());

  useEffect(() => {
    const handler = () => {
      setMutedSet(getLocalMutedChannels());
    };

    window.addEventListener(EVENT_NAME, handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener(EVENT_NAME, handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  return mutedSet;
}
