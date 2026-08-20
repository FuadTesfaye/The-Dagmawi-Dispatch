'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers';
import { TrackedChannel, Post } from '@/lib/types';
import { User, LogOut, Loader2, Heart, MessageSquare, Share2, Shield, Bot, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { formatTimeAgo, formatNumber } from '@/lib/utils';

export default function ProfilePage() {
  const { user, loading, logout, loginDemo } = useAuth();
  const [subscribedChannels, setSubscribedChannels] = useState<TrackedChannel[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState('Posts');
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
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col gap-8 font-teletype">
      {/* Profile Broadsheet Header */}
      {!user ? (
        <div className="broadsheet-card p-6 sm:p-8 flex flex-col sm:flex-row items-start justify-between gap-6">
          <div className="flex flex-col gap-3">
            <div className="inline-flex items-center gap-2 stamp-badge-gold stamp-badge text-xs self-start">
              <span>§ COURT REGISTRY · SCRIBE DOSSIER</span>
            </div>
            <h1 className="font-broadsheet font-black text-3xl sm:text-4xl text-[#f4f0e6] tracking-tight uppercase">
              Court Scribe Profile
            </h1>
            <p className="text-xs sm:text-sm text-[#a39e93] leading-relaxed max-w-md font-sans">
              Sign in via Telegram to follow publications, customize your personal ledger, and receive AI-synthesized channel briefs.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link href="/login" className="stamp-btn">
                AUTHENTICATE WITH TELEGRAM
              </Link>
              <button
                onClick={() => loginDemo('admin')}
                className="stamp-btn !bg-[#12141c] !text-[#a39e93] hover:!text-[#f4f0e6]"
              >
                DEMO AS ROYAL SCRIBE
              </button>
            </div>
          </div>
          <div className="w-20 h-20 border-2 border-[#3d4257] bg-[#12141c] flex items-center justify-center text-[#d97706] shrink-0">
            <User className="w-10 h-10" />
          </div>
        </div>
      ) : (
        <div className="broadsheet-card p-6 sm:p-8 flex flex-col gap-5">
          <div className="flex items-start justify-between gap-6">
            <div className="flex flex-col gap-1.5 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="font-broadsheet font-black text-2xl sm:text-3xl text-[#f4f0e6] tracking-tight uppercase">
                  {user.displayName}
                </h1>
                <span className="text-[#d97706] text-xs font-bold">
                  [VERIFIED]
                </span>
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

            {/* Avatar */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={
                user.photoUrl ||
                `https://api.dicebear.com/7.x/bottts/svg?seed=${user.displayName}`
              }
              alt={user.displayName}
              className="w-20 h-20 border-2 border-[#3d4257] bg-[#12141c] object-cover shrink-0"
            />
          </div>

          {/* Bio */}
          <p className="text-xs sm:text-sm text-[#d6d0c2] leading-relaxed font-sans">
            Universal Telegram dispatch archivist. Monitoring unfiltered opinions, tech rants, and AI synthesis across the Ethiopian and global creator networks.
          </p>

          {/* Stats Bar */}
          <div className="flex items-center gap-3 text-xs text-[#a39e93] uppercase pt-2 border-t border-[#262936]">
            <span>{formatNumber(subscribedChannels.length)} MONITORED CHANNELS</span>
            <span>·</span>
            <span className="text-[#d97706]">#1 IN TELEGRAM INTELLIGENCE</span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-1">
            <button className="stamp-btn">SUBSCRIBE TO DOSSIER</button>
            <button className="stamp-btn !bg-[#12141c] !text-[#a39e93] hover:!text-[#f4f0e6]">
              TELETYPE MESSAGE
            </button>
            <button
              onClick={logout}
              className="stamp-btn !bg-[#12141c] !text-[#a39e93] hover:!text-rose-400 !p-2"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Broadsheet Horizontal Tabs */}
      <div className="flex items-center gap-2 border-b-2 border-[#262936] pb-2 overflow-x-auto no-scrollbar text-xs uppercase font-bold">
        {['Activity', 'Posts', 'Chat', 'Replies', 'Likes', 'Subscriptions'].map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 border transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-[#f4f0e6] text-[#0c0d10] border-[#f4f0e6] shadow-[2px_2px_0px_0px_#000000]'
                  : 'bg-[#12141c] text-[#a39e93] border-[#262936] hover:border-[#f4f0e6] hover:text-[#f4f0e6]'
              }`}
            >
              <span>{tab}</span>
              {tab === 'Subscriptions' && subscribedChannels.length > 0 && (
                <span className="ml-1 text-[10px]">[{subscribedChannels.length}]</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Posts Feed / Tab Content */}
      <div className="flex flex-col gap-4">
        {loadingPosts ? (
          <div className="flex justify-center py-20 text-[#a39e93]">
            <Loader2 className="w-6 h-6 animate-spin text-[#d97706]" />
          </div>
        ) : posts.length === 0 ? (
          <div className="broadsheet-card p-10 text-center text-[#a39e93] text-xs">
            [ NO POSTS FOUND IN PUBLICATION LEDGER ]
          </div>
        ) : (
          posts.map((post) => {
            const lines = post.text ? post.text.trim().split('\n') : [];
            const title = lines[0] || 'Media Broadcast Dispatch';
            const body = lines.slice(1).join(' ').trim();

            return (
              <article
                key={`${post.channel}-${post.id}`}
                className="broadsheet-card p-5 sm:p-6 flex flex-col gap-3 group"
              >
                {/* Author row & Date */}
                <div className="flex items-center justify-between gap-2 border-b border-[#262936] pb-2">
                  <div className="flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={
                        post.channelInfo?.avatarUrl ||
                        `https://api.dicebear.com/7.x/identicon/svg?seed=${post.channel}`
                      }
                      alt={post.channel}
                      className="w-5 h-5 bg-[#12141c] border border-[#262936]"
                    />
                    <span className="text-xs font-bold uppercase tracking-wider text-[#a39e93] group-hover:text-[#d97706] transition-colors">
                      {post.channelInfo?.name || `@${post.channel}`}
                    </span>
                  </div>
                  <span className="text-[10px] text-[#a39e93] uppercase">
                    {formatTimeAgo(post.date)}
                  </span>
                </div>

                {/* Main Content & Thumbnail */}
                <div className="flex items-start justify-between gap-6">
                  <div className="flex-1 flex flex-col gap-1.5">
                    <h2 className="font-broadsheet font-bold text-lg sm:text-xl text-[#f4f0e6] leading-tight group-hover:text-[#d97706] transition-colors line-clamp-2 uppercase">
                      {title}
                    </h2>
                    {body && (
                      <p className="text-xs sm:text-sm text-[#a39e93] leading-relaxed line-clamp-3 font-sans">
                        {body}
                      </p>
                    )}
                    <div className="text-[10px] text-[#6b665c] uppercase mt-1">
                      PARCHMENT WIRE · {post.channel.toUpperCase()}
                    </div>
                  </div>

                  {/* Thumbnail / Media Preview */}
                  {post.mediaType && post.mediaType !== 'none' && (
                    <div className="w-20 h-20 bg-[#12141c] border border-[#262936] flex flex-col items-center justify-center shrink-0 text-[#a39e93]">
                      <span className="text-[9px] font-bold uppercase text-[#d97706]">
                        {post.mediaType}
                      </span>
                    </div>
                  )}
                </div>

                {/* Engagement Bar */}
                <div className="flex items-center gap-4 mt-1 text-xs text-[#a39e93] pt-2 border-t border-[#262936]">
                  <div className="flex items-center gap-1.5 hover:text-[#d97706] cursor-pointer transition-colors">
                    <Heart className="w-3.5 h-3.5 text-[#d97706]" />
                    <span>
                      {formatNumber(
                        (post.reactions &&
                          Object.values(post.reactions).reduce((a, b) => a + b, 0)) ||
                          0
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 hover:text-[#f4f0e6] cursor-pointer transition-colors">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>{post.commentCount || 0}</span>
                  </div>
                  <div className="flex items-center gap-1.5 hover:text-[#f4f0e6] cursor-pointer transition-colors ml-auto">
                    <Share2 className="w-3.5 h-3.5" />
                  </div>
                </div>
              </article>
            );
          })
        )}

        {/* Not Logged In Prompt at the bottom */}
        {!user && !loadingPosts && posts.length > 0 && (
          <div className="broadsheet-card p-8 mt-6 flex flex-col items-center gap-3 text-center">
            <h3 className="font-broadsheet font-bold text-2xl text-[#f4f0e6] uppercase">
              Log in for full archive
            </h3>
            <p className="text-xs text-[#a39e93] max-w-sm font-sans">
              Authenticate to browse the entire multi-channel archive, command AI briefs, and join community inquests.
            </p>
            <Link href="/login" className="stamp-btn mt-2">
              AUTHENTICATE VIA TELEGRAM
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
