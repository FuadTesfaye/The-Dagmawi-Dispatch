'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers';
import { TrackedChannel } from '@/lib/types';
import { ChannelCard } from '@/components/channel-card';
import { User, LogOut, Loader2 } from 'lucide-react';
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
      <div className="flex justify-center items-center py-20 text-[#a39e93] font-teletype">
        <Loader2 className="w-6 h-6 animate-spin text-[#d97706]" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto py-12 text-center broadsheet-card p-8 flex flex-col items-center gap-4 font-teletype">
        <div className="w-10 h-10 border-2 border-[#262936] bg-[#12141c] flex items-center justify-center text-[#d97706]">
          <User className="w-5 h-5" />
        </div>
        <h2 className="text-base font-bold text-[#f4f0e6] uppercase">[ SCRIBE IDENTIFICATION REQUIRED ]</h2>
        <p className="text-xs text-[#a39e93] leading-relaxed">
          Authenticate via Telegram or choose a persona to access your publication ledger.
        </p>

        <div className="flex flex-col gap-2 w-full pt-2">
          <Link
            href="/login"
            className="stamp-btn text-center"
          >
            AUTHENTICATE WITH TELEGRAM
          </Link>
          <button
            onClick={() => loginDemo('admin')}
            className="stamp-btn !bg-[#12141c] !text-[#a39e93] hover:!text-[#f4f0e6]"
          >
            INSTANT PERSONA: ROYAL SCRIBE
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto font-teletype">
      {/* Scribe Credential Card */}
      <div className="broadsheet-card p-6 sm:p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={
              user.photoUrl ||
              `https://api.dicebear.com/7.x/bottts/svg?seed=${user.displayName}`
            }
            alt={user.displayName}
            className="w-16 h-16 border-2 border-[#3d4257] bg-[#12141c] object-cover"
          />
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="font-broadsheet font-black text-xl sm:text-2xl text-[#f4f0e6] uppercase">
                {user.displayName}
              </h1>
              {user.role === 'admin' && (
                <span className="stamp-badge-gold stamp-badge text-[10px]">
                  COURT SCRIBE
                </span>
              )}
            </div>
            <span className="text-xs text-[#a39e93]">
              {user.username ? `@${user.username}` : `TELEGRAM ID: ${user.telegramUserId}`}
            </span>
          </div>
        </div>

        <button
          onClick={logout}
          className="stamp-btn !bg-[#12141c] !text-[#a39e93] hover:!text-rose-400 hover:!border-rose-500 flex items-center gap-1.5"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>SIGN OUT</span>
        </button>
      </div>

      {/* Subscriptions Ledger */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-[#262936] pb-1">
          <h2 className="text-xs font-bold uppercase text-[#f4f0e6]">
            § MONITORED SUBSCRIPTIONS ({subscribedChannels.length})
          </h2>
          <Link
            href="/channels"
            className="text-xs text-[#d97706] hover:underline"
          >
            + REGISTER NEW CHANNEL
          </Link>
        </div>

        {loadingSubs ? (
          <div className="flex justify-center py-12 text-[#a39e93]">
            <Loader2 className="w-6 h-6 animate-spin text-[#d97706]" />
          </div>
        ) : subscribedChannels.length === 0 ? (
          <div className="broadsheet-card p-8 text-center text-[#a39e93] text-xs flex flex-col items-center gap-3">
            <p>[ NO CHANNELS CURRENTLY IN YOUR LEDGER ]</p>
            <Link
              href="/channels"
              className="stamp-btn"
            >
              BROWSE REGISTRY
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {subscribedChannels.map((ch) => (
              <ChannelCard key={ch.id} channel={ch} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
