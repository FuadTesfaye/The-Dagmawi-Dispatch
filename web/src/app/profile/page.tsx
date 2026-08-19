'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers';
import { TrackedChannel } from '@/lib/types';
import { ChannelCard } from '@/components/channel-card';
import { User, Shield, Radio, LogOut, LogIn, Loader2, Crown } from 'lucide-react';
import Link from 'next/link';

export default function ProfilePage() {
  const { user, loading, logout, loginDemo } = useAuth();
  const [subscribedChannels, setSubscribedChannels] = useState<TrackedChannel[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoadingSubs(true);

    fetch('/api/channels')
      .then((res) => res.json())
      .then((data) => {
        if (data.channels) {
          const subs = data.channels.filter((c: any) => c.isSubscribed);
          setSubscribedChannels(subs);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingSubs(false));
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20 text-amber-400">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto py-12 text-center glass-card rounded-3xl p-8 flex flex-col items-center gap-4 border border-amber-500/30 shadow-2xl">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/40">
          <User className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-black text-zinc-100">Sign In Required</h2>
        <p className="text-xs text-zinc-400 leading-relaxed font-medium">
          Sign in with Telegram or select a demo persona to inspect your kingdom profile and followed dispatches.
        </p>

        <div className="flex flex-col gap-2 w-full pt-2">
          <Link
            href="/login"
            className="w-full py-3 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-zinc-950 font-black text-xs shadow-md shadow-amber-500/25 text-center"
          >
            Sign In with Telegram
          </Link>
          <button
            onClick={() => loginDemo('admin')}
            className="w-full py-3 rounded-full bg-zinc-900 border border-zinc-800 text-amber-300 font-extrabold text-xs hover:bg-zinc-800"
          >
            Instant Demo Admin
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      {/* Profile Hero Card */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative overflow-hidden shadow-2xl">
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={
              user.photoUrl ||
              `https://api.dicebear.com/7.x/bottts/svg?seed=${user.displayName}`
            }
            alt={user.displayName}
            className="w-16 h-16 rounded-3xl bg-zinc-800 border-2 border-amber-500/40 object-cover"
          />
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-3xl font-black text-zinc-100">
                {user.displayName}
              </h1>
              {user.role === 'admin' && (
                <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-black border border-amber-500/40">
                  <Crown className="w-3 h-3" />
                  Court Admin
                </span>
              )}
            </div>
            <span className="text-xs text-zinc-400 font-bold">
              {user.username ? `@${user.username}` : `Telegram ID: ${user.telegramUserId}`}
            </span>
          </div>
        </div>

        <button
          onClick={logout}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-zinc-900 border border-zinc-800 hover:border-rose-500/40 text-xs font-extrabold text-zinc-300 hover:text-rose-400 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Subscribed Channels Section */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-amber-400" />
            <h2 className="text-base font-extrabold text-zinc-100">
              Subscribed Channels ({subscribedChannels.length})
            </h2>
          </div>
          <Link
            href="/channels"
            className="text-xs font-bold text-amber-400 hover:text-amber-300"
          >
            Find More Channels +
          </Link>
        </div>

        {loadingSubs ? (
          <div className="flex justify-center py-12 text-amber-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : subscribedChannels.length === 0 ? (
          <div className="glass-card rounded-3xl p-8 text-center text-zinc-400 text-xs font-medium flex flex-col items-center gap-3">
            <span>📡</span>
            <p>You have not subscribed to any channels yet.</p>
            <Link
              href="/channels"
              className="px-5 py-2.5 rounded-full bg-amber-500 text-zinc-950 font-black text-xs shadow-md shadow-amber-500/20"
            >
              Browse Directory
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {subscribedChannels.map((ch) => (
              <ChannelCard key={ch.id} channel={ch} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
