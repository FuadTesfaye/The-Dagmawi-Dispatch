'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers';
import { TrackedChannel, Post } from '@/lib/types';
import { User, LogOut, Loader2, Heart, MessageCircle, Share } from 'lucide-react';
import Link from 'next/link';
import { formatTimeAgo, formatNumber } from '@/lib/utils';

export default function ProfilePage() {
  const { user, loading, logout, loginDemo } = useAuth();
  const [subscribedChannels, setSubscribedChannels] = useState<TrackedChannel[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [loadingPosts, setLoadingPosts] = useState(false);

  useEffect(() => {
    // Only fetch subs if logged in, but fetch posts anyway just in case
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
    fetch('/api/posts')
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
      <div className="flex justify-center items-center py-20 text-[#a39e93] font-teletype">
        <Loader2 className="w-6 h-6 animate-spin text-[#d97706]" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6 font-teletype py-8 px-4">
      {/* Profile Header Section */}
      <div className="flex items-start justify-between">
        {!user ? (
          <>
            <div className="flex flex-col gap-1">
              <h1 className="font-broadsheet font-black text-3xl text-[#f4f0e6] uppercase">
                Welcome Back
              </h1>
              <p className="mt-2 text-sm text-[#a39e93]">
                Sign in to access your publication ledger.
              </p>

              <div className="flex flex-col gap-2 mt-4 max-w-xs">
                <Link href="/login" className="stamp-btn text-center">
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
            <div className="flex-shrink-0 ml-4">
              <div className="w-20 h-20 rounded-2xl border-2 border-[#3d4257] bg-[#12141c] flex items-center justify-center text-[#d97706]">
                <User className="w-8 h-8" />
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <h1 className="font-broadsheet font-black text-2xl text-[#f4f0e6] uppercase">
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
              <p className="mt-2 text-sm text-[#f4f0e6]">
                Lurking the depths of Telegram since 2026
              </p>
              <div className="flex items-center gap-4 mt-2 text-xs text-[#a39e93]">
                <span>{formatNumber(subscribedChannels.length)} Channels</span>
                <span>{formatNumber(posts.length)} Posts</span>
              </div>
              <div className="flex items-center gap-3 mt-4">
                <button className="stamp-btn">SUBSCRIBE</button>
                <button className="stamp-btn !bg-[#12141c] !text-[#a39e93] hover:!text-[#f4f0e6] border-[#3d4257]">
                  MESSAGE
                </button>
                <button
                  onClick={logout}
                  className="stamp-btn !bg-[#12141c] !text-[#a39e93] hover:!text-rose-400 border-[#3d4257]"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-shrink-0 ml-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={
                  user.photoUrl ||
                  `https://api.dicebear.com/7.x/bottts/svg?seed=${user.displayName}`
                }
                alt={user.displayName}
                className="w-20 h-20 rounded-2xl border-2 border-[#3d4257] bg-[#12141c] object-cover"
              />
            </div>
          </>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-[#262936] mt-4 overflow-x-auto no-scrollbar">
        {['Activity', 'Posts', 'Likes', 'Subscriptions'].map((tab) => (
          <button
            key={tab}
            className={`pb-2 text-sm whitespace-nowrap ${
              tab === 'Posts'
                ? 'text-[#d97706] border-b-2 border-[#d97706]'
                : 'text-[#a39e93] hover:text-[#f4f0e6]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Posts Feed Section */}
      <div className="flex flex-col">
        {loadingPosts ? (
          <div className="flex justify-center py-12 text-[#a39e93]">
            <Loader2 className="w-6 h-6 animate-spin text-[#d97706]" />
          </div>
        ) : posts.length === 0 ? (
          <div className="broadsheet-card p-8 text-center text-[#a39e93] text-xs flex flex-col items-center gap-3 mt-4">
            <p>[ NO POSTS FOUND IN LEDGER ]</p>
          </div>
        ) : (
          posts.map((post) => {
            const lines = post.text ? post.text.split('\n') : [];
            const title = lines[0] || 'Media Post';
            const body = lines.slice(1).join(' ').trim();

            return (
              <div
                key={post.id}
                className="flex flex-col py-6 border-b border-[#262936] last:border-b-0 gap-4"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={
                        post.channelInfo?.avatarUrl ||
                        `https://api.dicebear.com/7.x/identicon/svg?seed=${post.channel}`
                      }
                      alt={post.channel}
                      className="w-6 h-6 rounded-md bg-[#12141c] border border-[#3d4257]"
                    />
                    <span className="text-xs text-[#f4f0e6] font-bold">
                      {post.channelInfo?.name || `@${post.channel}`}
                    </span>
                  </div>
                  <span className="text-xs text-[#a39e93]">
                    {formatTimeAgo(post.date)}
                  </span>
                </div>

                <div className="flex gap-4">
                  <div className="flex-1 flex flex-col gap-1.5">
                    <h3 className="font-bold text-lg text-[#f4f0e6] line-clamp-1 leading-tight">
                      {title}
                    </h3>
                    {body && (
                      <p className="text-sm text-[#a39e93] line-clamp-3 leading-relaxed">
                        {body}
                      </p>
                    )}
                  </div>
                  {post.mediaType && post.mediaType !== 'none' && (
                    <div className="w-24 h-24 bg-[#12141c] border border-[#262936] rounded-md flex-shrink-0 flex items-center justify-center overflow-hidden">
                      <span className="text-[10px] text-[#a39e93] uppercase tracking-wider font-bold">
                        {post.mediaType}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-6 mt-1 text-[#a39e93]">
                  <div className="flex items-center gap-1.5 hover:text-rose-400 cursor-pointer transition-colors">
                    <Heart className="w-4 h-4" />
                    <span className="text-xs">
                      {formatNumber(
                        (post.reactions &&
                          Object.values(post.reactions).reduce((a, b) => a + b, 0)) ||
                          0
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 hover:text-[#f4f0e6] cursor-pointer transition-colors">
                    <MessageCircle className="w-4 h-4" />
                    <span className="text-xs">
                      {formatNumber(post.commentCount || 0)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 hover:text-[#f4f0e6] cursor-pointer transition-colors ml-auto">
                    <Share className="w-4 h-4" />
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Not Logged In Prompt at the bottom */}
        {!user && !loadingPosts && posts.length > 0 && (
          <div className="broadsheet-card p-6 mt-8 flex flex-col items-center gap-3 text-center">
            <h3 className="font-broadsheet font-bold text-xl text-[#f4f0e6] uppercase">
              Log in for more
            </h3>
            <p className="text-sm text-[#a39e93]">
              Authenticate to view full archives, react, and comment.
            </p>
            <Link href="/login" className="stamp-btn mt-2">
              SIGN IN
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
