'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers';
import { TrackedChannel, Post } from '@/lib/types';
import { User, LogOut, Loader2, Heart, MessageCircle, Share2, MoreHorizontal, Check, Shield } from 'lucide-react';
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
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col gap-8">
      {/* Substack Profile Header */}
      {!user ? (
        <div className="flex items-start justify-between gap-6 pb-6 border-b border-[#1f2330]">
          <div className="flex flex-col gap-3">
            <h1 className="font-broadsheet font-black text-3xl sm:text-4xl text-[#f4f0e6] tracking-tight uppercase">
              Court Scribe Profile
            </h1>
            <p className="text-sm text-[#a39e93] leading-relaxed max-w-md">
              Sign in via Telegram to follow publications, customize your personal ledger, and receive AI-synthesized channel briefs.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <Link href="/login" className="substack-btn-primary">
                Sign In With Telegram
              </Link>
              <button
                onClick={() => loginDemo('admin')}
                className="substack-btn-secondary"
              >
                Demo as Royal Scribe
              </button>
            </div>
          </div>
          <div className="w-24 h-24 rounded-full border-2 border-[#2e3547] bg-[#161822] flex items-center justify-center text-[#d97706] shrink-0">
            <User className="w-10 h-10" />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-5 pb-6 border-b border-[#1f2330]">
          <div className="flex items-start justify-between gap-6">
            <div className="flex flex-col gap-1.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-broadsheet font-black text-2xl sm:text-3xl text-[#f4f0e6] tracking-tight">
                  {user.displayName}
                </h1>
                <span className="w-5 h-5 rounded-full bg-[#d97706]/20 text-[#d97706] text-xs font-bold inline-flex items-center justify-center">
                  ✓
                </span>
                {user.role === 'admin' && (
                  <span className="stamp-badge stamp-badge-gold text-[10px]">
                    COURT SCRIBE
                  </span>
                )}
              </div>
              <span className="font-teletype text-xs text-[#a39e93]">
                {user.username ? `@${user.username}` : `Telegram ID: ${user.telegramUserId}`}
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
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 border-[#2e3547] bg-[#161822] object-cover shrink-0 shadow-lg"
            />
          </div>

          {/* Bio */}
          <p className="text-sm sm:text-base text-[#d6d0c2] leading-relaxed">
            Universal Telegram dispatch archivist. Monitoring unfiltered opinions, tech rants, and AI synthesis across the Ethiopian and global creator networks.
          </p>

          {/* Stats Bar */}
          <div className="flex items-center gap-3 text-xs font-teletype text-[#a39e93]">
            <span>{formatNumber(subscribedChannels.length)} Subscribed Channels</span>
            <span>•</span>
            <span className="text-[#d97706]">#1 in Telegram Intelligence</span>
          </div>

          {/* Substack Action Buttons */}
          <div className="flex items-center gap-2 pt-1">
            <button className="flex-1 sm:flex-initial px-6 py-2 rounded-lg bg-[#0ea5e9]/90 hover:bg-[#0ea5e9] text-white font-semibold text-xs transition-all shadow-sm">
              Subscribe
            </button>
            <button className="flex-1 sm:flex-initial px-6 py-2 rounded-lg bg-[#161822] hover:bg-[#1f2330] border border-[#2e3547] text-[#f4f0e6] font-medium text-xs transition-all">
              Message
            </button>
            <button
              onClick={logout}
              className="p-2 rounded-lg bg-[#161822] hover:bg-rose-950/40 border border-[#2e3547] hover:border-rose-500/40 text-[#a39e93] hover:text-rose-400 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Substack Horizontal Navigation Tabs */}
      <div className="flex items-center gap-8 border-b border-[#1f2330] overflow-x-auto no-scrollbar font-teletype text-xs sm:text-sm">
        {['Activity', 'Posts', 'Chat', 'Replies', 'Likes', 'Subscriptions'].map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 font-semibold transition-all whitespace-nowrap relative ${
                isActive
                  ? 'text-[#f4f0e6]'
                  : 'text-[#a39e93] hover:text-[#f4f0e6]'
              }`}
            >
              {tab}
              {tab === 'Subscriptions' && subscribedChannels.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] bg-[#1f2330] text-[#a39e93]">
                  {subscribedChannels.length}
                </span>
              )}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#d97706] rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Posts Feed / Tab Content */}
      <div className="flex flex-col gap-6">
        {loadingPosts ? (
          <div className="flex justify-center py-20 text-[#a39e93] font-teletype">
            <Loader2 className="w-6 h-6 animate-spin text-[#d97706]" />
          </div>
        ) : posts.length === 0 ? (
          <div className="substack-card p-10 rounded-2xl text-center text-[#a39e93] text-xs font-teletype">
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
                className="flex flex-col gap-3 py-6 border-b border-[#1f2330] last:border-b-0 group"
              >
                {/* Author row & Date */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={
                        post.channelInfo?.avatarUrl ||
                        `https://api.dicebear.com/7.x/identicon/svg?seed=${post.channel}`
                      }
                      alt={post.channel}
                      className="w-5 h-5 rounded-full bg-[#161822] border border-[#2e3547]"
                    />
                    <span className="font-teletype text-xs font-bold uppercase tracking-wider text-[#a39e93] group-hover:text-[#d97706] transition-colors">
                      {post.channelInfo?.name || post.channel}
                    </span>
                  </div>
                  <span className="font-teletype text-xs text-[#6b665c] uppercase">
                    {formatTimeAgo(post.date)}
                  </span>
                </div>

                {/* Main Content & Thumbnail */}
                <div className="flex items-start justify-between gap-6">
                  <div className="flex-1 flex flex-col gap-1.5">
                    <h2 className="font-broadsheet font-bold text-lg sm:text-xl text-[#f4f0e6] leading-snug group-hover:text-[#f4f0e6] transition-colors line-clamp-2">
                      {title}
                    </h2>
                    {body && (
                      <p className="text-sm text-[#a39e93] leading-relaxed line-clamp-3 font-sans">
                        {body}
                      </p>
                    )}
                    <div className="font-teletype text-[11px] text-[#6b665c] mt-1">
                      {post.channel.toUpperCase()} · 2 MIN READ
                    </div>
                  </div>

                  {/* Thumbnail / Media Preview */}
                  {post.mediaType && post.mediaType !== 'none' && (
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl bg-[#151822] border border-[#1f2330] flex flex-col items-center justify-center shrink-0 text-[#a39e93] overflow-hidden">
                      <span className="text-[10px] font-teletype font-bold uppercase text-[#d97706]">
                        {post.mediaType}
                      </span>
                    </div>
                  )}
                </div>

                {/* Substack Engagement Bar */}
                <div className="flex items-center gap-6 mt-2 font-teletype text-xs text-[#a39e93]">
                  <div className="flex items-center gap-1.5 hover:text-rose-400 cursor-pointer transition-colors">
                    <Heart className="w-4 h-4" />
                    <span>
                      {formatNumber(
                        (post.reactions &&
                          Object.values(post.reactions).reduce((a, b) => a + b, 0)) ||
                          0
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 hover:text-[#f4f0e6] cursor-pointer transition-colors">
                    <MessageCircle className="w-4 h-4" />
                    <span>{post.commentCount || 0}</span>
                  </div>
                  <div className="flex items-center gap-1.5 hover:text-[#f4f0e6] cursor-pointer transition-colors ml-auto">
                    <Share2 className="w-4 h-4" />
                  </div>
                </div>
              </article>
            );
          })
        )}

        {/* Not Logged In Prompt at the bottom */}
        {!user && !loadingPosts && posts.length > 0 && (
          <div className="p-8 mt-6 rounded-2xl bg-gradient-to-b from-[#161822] to-[#0f1118] border border-[#1f2330] flex flex-col items-center gap-3 text-center">
            <h3 className="font-broadsheet font-bold text-2xl text-[#f4f0e6] uppercase">
              Log in for more
            </h3>
            <p className="text-sm text-[#a39e93] max-w-sm">
              Authenticate to browse the entire multi-channel archive, command AI briefs, and join community discussions.
            </p>
            <Link href="/login" className="substack-btn-primary mt-2">
              Sign In to Continue
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
