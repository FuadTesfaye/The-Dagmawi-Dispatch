'use client';

import React, { useState, useEffect } from 'react';
import { useAuth, useToast } from '@/components/providers';
import { TrackedChannel, Post } from '@/lib/types';
import { PostCard } from '@/components/post-card';
import { ChannelCard } from '@/components/channel-card';
import { User, LogOut, Loader2, Radio } from 'lucide-react';
import Link from 'next/link';
import { formatNumber } from '@/lib/utils';

export default function ProfilePage() {
  const { user, loading, logout, loginDemo } = useAuth();
  const { showToast } = useToast();
  const [subscribedChannels, setSubscribedChannels] = useState<TrackedChannel[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState('Dispatches');
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [loadingPosts, setLoadingPosts] = useState(false);

  useEffect(() => {
    if (user) {
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
    }

    setLoadingPosts(true);
    fetch('/api/posts?limit=25')
      .then((res) => res.json())
      .then((data) => {
        if (data.posts) {
          setPosts(data.posts);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingPosts(false));
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-28 text-[#a39e93] font-teletype">
        <Loader2 className="w-7 h-7 animate-spin text-[#d97706]" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-8 flex flex-col gap-6 sm:gap-8 font-teletype">
      {/* Profile Broadsheet Header */}
      {!user ? (
        <div className="broadsheet-card p-4 sm:p-8 flex flex-col sm:flex-row items-start justify-between gap-6">
          <div className="flex flex-col gap-3">
            <div className="inline-flex items-center gap-2 stamp-badge-gold stamp-badge text-xs self-start">
              <span>§ COURT REGISTRY · SCRIBE DOSSIER</span>
            </div>
            <h1 className="font-broadsheet font-black text-2xl sm:text-4xl text-[#f4f0e6] tracking-tight uppercase">
              Court Scribe Profile
            </h1>
            <p className="text-xs sm:text-sm text-[#a39e93] leading-relaxed max-w-md font-sans">
              Sign in via Telegram to follow publications, customize your personal ledger, and receive AI-synthesized channel briefs.
            </p>
            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              <Link href="/login" className="stamp-btn active:scale-95 text-xs font-bold">
                AUTHENTICATE WITH TELEGRAM
              </Link>
              <button
                onClick={() => loginDemo('admin')}
                className="stamp-btn !bg-[#12141c] !text-[#a39e93] hover:!text-[#f4f0e6] active:scale-95 text-xs"
              >
                DEMO AS ROYAL SCRIBE
              </button>
            </div>
          </div>
          <div className="w-16 h-16 sm:w-20 sm:h-20 border-2 border-[#3d4257] bg-[#12141c] flex items-center justify-center text-[#d97706] shrink-0">
            <User className="w-8 h-8 sm:w-10 sm:h-10" />
          </div>
        </div>
      ) : (
        <div className="broadsheet-card p-4 sm:p-7 flex flex-col gap-4 sm:gap-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-broadsheet font-black text-2xl sm:text-3xl text-[#f4f0e6] tracking-tight uppercase truncate">
                  {user.displayName}
                </h1>
                <span className="stamp-badge-gold stamp-badge text-[10px]">
                  VERIFIED SCRIBE
                </span>
                {user.role === 'admin' && (
                  <span className="stamp-badge-gold stamp-badge text-[10px]">
                    COURT SCRIBE
                  </span>
                )}
              </div>
              <span className="text-xs text-[#a39e93] truncate">
                {user.username ? `@${user.username}` : `TELEGRAM ID: ${user.telegramUserId}`}
              </span>
            </div>

            {/* Avatar */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={
                user.photoUrl ||
                `https://api.dicebear.com/7.x/bottts/svg?seed=${user.displayName}`
              }
              alt={user.displayName}
              className="w-16 h-16 sm:w-20 sm:h-20 border-2 border-[#3d4257] bg-[#12141c] object-cover shrink-0 rounded-sm"
            />
          </div>

          {/* Bio */}
          <p className="text-xs sm:text-sm text-[#d6d0c2] leading-relaxed font-sans">
            Universal Telegram dispatch archivist. Monitoring unfiltered opinions, tech rants, and AI synthesis across the creator networks.
          </p>

          {/* Stats Bar */}
          <div className="flex items-center gap-2.5 sm:gap-3 text-xs text-[#a39e93] uppercase pt-2 border-t border-[#262936] flex-wrap">
            <span>{formatNumber(subscribedChannels.length)} MONITORED CHANNELS</span>
            <span>·</span>
            <span className="text-[#d97706]">#1 IN TELEGRAM INTELLIGENCE</span>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              onClick={() => showToast('Dossier notifications enabled', 'success')}
              className="stamp-btn text-xs active:scale-95"
            >
              SUBSCRIBE TO DOSSIER
            </button>
            <Link
              href="/channels"
              className="stamp-btn !bg-[#12141c] !text-[#a39e93] hover:!text-[#f4f0e6] text-xs active:scale-95"
            >
              DISCOVER CHANNELS
            </Link>
            <button
              onClick={logout}
              className="stamp-btn !bg-[#12141c] !text-[#a39e93] hover:!text-rose-400 !p-2 active:scale-95"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Broadsheet Horizontal Tabs */}
      <div className="flex items-center gap-1.5 sm:gap-2 border-b-2 border-[#262936] pb-2 overflow-x-auto no-scrollbar text-xs uppercase font-bold">
        {['Dispatches', 'Subscriptions', 'Activity'].map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 border transition-all whitespace-nowrap active:scale-95 ${
                isActive
                  ? 'bg-[#f4f0e6] text-[#0c0d10] border-[#f4f0e6] shadow-[2px_2px_0px_0px_#000000]'
                  : 'bg-[#12141c] text-[#a39e93] border-[#262936] hover:border-[#f4f0e6] hover:text-[#f4f0e6]'
              }`}
            >
              <span>{tab}</span>
              {tab === 'Subscriptions' && (
                <span className="ml-1 text-[10px]">[{subscribedChannels.length}]</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content Stream */}
      {activeTab === 'Subscriptions' ? (
        <div className="flex flex-col gap-3">
          {loadingSubs ? (
            <div className="flex justify-center py-16 text-[#a39e93]">
              <Loader2 className="w-6 h-6 animate-spin text-[#d97706]" />
            </div>
          ) : subscribedChannels.length === 0 ? (
            <div className="broadsheet-card p-10 text-center text-[#a39e93] text-xs flex flex-col items-center gap-3">
              <Radio className="w-8 h-8 text-[#d97706]" />
              <p className="font-bold">[ YOU ARE NOT FOLLOWING ANY CHANNELS YET ]</p>
              <Link href="/channels" className="stamp-btn mt-1">
                EXPLORE PUBLICATION DIRECTORY
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
              {subscribedChannels.map((ch) => (
                <ChannelCard key={ch.id} channel={ch} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3.5 sm:gap-4">
          {loadingPosts ? (
            <div className="flex justify-center py-20 text-[#a39e93]">
              <Loader2 className="w-6 h-6 animate-spin text-[#d97706]" />
            </div>
          ) : posts.length === 0 ? (
            <div className="broadsheet-card p-10 text-center text-[#a39e93] text-xs">
              [ NO POSTS FOUND IN PUBLICATION LEDGER ]
            </div>
          ) : (
            posts.map((post) => (
              <PostCard key={`${post.channel}-${post.id}`} post={post} />
            ))
          )}

          {/* Not Logged In Prompt */}
          {!user && !loadingPosts && posts.length > 0 && (
            <div className="broadsheet-card p-6 sm:p-8 mt-4 flex flex-col items-center gap-3 text-center">
              <h3 className="font-broadsheet font-bold text-xl sm:text-2xl text-[#f4f0e6] uppercase">
                Log in for full archive
              </h3>
              <p className="text-xs text-[#a39e93] max-w-sm font-sans">
                Authenticate to browse the entire multi-channel archive, command AI briefs, and join community inquests.
              </p>
              <Link href="/login" className="stamp-btn mt-1 active:scale-95">
                AUTHENTICATE VIA TELEGRAM
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
