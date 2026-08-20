'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Search, X, Loader2, Radio, BookOpen, ArrowRight, ArrowUpRight } from 'lucide-react';
import { TrackedChannel, Post } from '@/lib/types';
import { formatTimeAgo } from '@/lib/utils';

import { fetchWithCache, getCached } from '@/lib/cache';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'posts' | 'channels'>('all');
  const [posts, setPosts] = useState<Post[]>([]);
  const [channels, setChannels] = useState<TrackedChannel[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto focus on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 60);
    } else {
      setQuery('');
      setPosts([]);
      setChannels([]);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Instant local lookup + debounced server query
  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      setPosts([]);
      setChannels([]);
      setLoading(false);
      return;
    }

    // 1. Instant 0ms local channel lookup from memory cache
    const cachedChannels = getCached<{ channels: TrackedChannel[] }>('/api/channels').data?.channels;
    if (cachedChannels) {
      const instantMatches = cachedChannels.filter(
        (c) => c.id.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
      );
      if (instantMatches.length > 0) {
        setChannels(instantMatches);
      }
    }

    setLoading(true);
    const timer = setTimeout(() => {
      Promise.all([
        fetchWithCache<{ channels: TrackedChannel[] }>(`/api/channels?q=${encodeURIComponent(query.trim())}`),
        fetchWithCache<{ posts: Post[] }>(`/api/posts?search=${encodeURIComponent(query.trim())}&limit=12`),
      ])
        .then(([chanData, postData]) => {
          if (chanData?.channels) setChannels(chanData.channels);
          if (postData?.posts) setPosts(postData.posts);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 150);

    return () => clearTimeout(timer);
  }, [query]);

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const totalResults = posts.length + channels.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-4 sm:pt-16 md:pt-20 px-2.5 sm:px-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150 cursor-pointer"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[92vh] sm:max-h-[85vh] bg-[var(--card-bg)] border-2 border-[var(--ink-border-heavy)] shadow-[6px_6px_0px_0px_var(--shadow-color)] sm:shadow-[10px_10px_0px_0px_var(--shadow-color)] flex flex-col font-teletype overflow-hidden animate-in zoom-in-95 duration-150 cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-2.5 bg-[var(--subtle-bg)] border-b border-[var(--ink-border)] text-[10px] text-[var(--paper-muted)] uppercase tracking-wider">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-[#d97706] shrink-0 animate-pulse" />
            <span className="truncate font-bold">UNIVERSAL ARCHIVE SEARCH & INDEX</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:text-[var(--paper-cream)] transition-colors active:scale-95 shrink-0"
            title="Close (Esc)"
          >
            [ ESC / ✕ ]
          </button>
        </div>

        {/* Search Input Box */}
        <div className="relative flex items-center border-b-2 border-[var(--ink-border)] bg-[var(--input-bg)] px-3 sm:px-4 py-2.5 sm:py-3">
          <Search className="w-4 h-4 sm:w-5 sm:h-5 text-[#d97706] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search wires, channels, keywords, #tags..."
            className="w-full pl-2.5 pr-8 py-1 bg-transparent text-sm sm:text-base text-[var(--paper-cream)] placeholder-[var(--paper-faint)] font-teletype uppercase focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-[var(--paper-muted)] hover:text-[var(--paper-cream)] p-1 text-xs active:scale-95"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        {query.trim() && (
          <div className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-[var(--subtle-bg)] border-b border-[var(--ink-border)] text-[11px] sm:text-xs overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-2.5 py-1 border transition-colors uppercase shrink-0 active:scale-95 ${
                activeTab === 'all'
                  ? 'bg-[var(--paper-cream)] text-[var(--ink-bg)] border-[var(--paper-cream)] font-bold'
                  : 'bg-[var(--card-bg)] text-[var(--paper-muted)] border-[var(--ink-border)] hover:text-[var(--paper-cream)]'
              }`}
            >
              ALL ({totalResults})
            </button>
            <button
              onClick={() => setActiveTab('posts')}
              className={`px-2.5 py-1 border transition-colors uppercase shrink-0 active:scale-95 ${
                activeTab === 'posts'
                  ? 'bg-[var(--paper-cream)] text-[var(--ink-bg)] border-[var(--paper-cream)] font-bold'
                  : 'bg-[var(--card-bg)] text-[var(--paper-muted)] border-[var(--ink-border)] hover:text-[var(--paper-cream)]'
              }`}
            >
              DISPATCHES ({posts.length})
            </button>
            <button
              onClick={() => setActiveTab('channels')}
              className={`px-2.5 py-1 border transition-colors uppercase shrink-0 active:scale-95 ${
                activeTab === 'channels'
                  ? 'bg-[var(--paper-cream)] text-[var(--ink-bg)] border-[var(--paper-cream)] font-bold'
                  : 'bg-[var(--card-bg)] text-[var(--paper-muted)] border-[var(--ink-border)] hover:text-[var(--paper-cream)]'
              }`}
            >
              CHANNELS ({channels.length})
            </button>
          </div>
        )}

        {/* Search Results Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 flex flex-col gap-3 sm:gap-4 no-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-[var(--paper-muted)]">
              <Loader2 className="w-6 h-6 animate-spin text-[#d97706]" />
              <span className="text-xs uppercase">[ SCANNING DISPATCH ARCHIVES... ]</span>
            </div>
          ) : !query.trim() ? (
            <div className="flex flex-col gap-3 py-6 text-center text-[var(--paper-muted)]">
              <p className="text-xs uppercase">[ TYPE A QUERY TO BEGIN DECODING ARCHIVES ]</p>
              <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 text-[11px] pt-2">
                <span className="text-[var(--paper-faint)]">QUICK SUGGESTIONS:</span>
                {['dagmawi_babi', 'tech', 'ethiopia', 'ai', 'crypto'].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setQuery(tag)}
                    className="px-2 py-0.5 border border-[var(--ink-border)] bg-[var(--subtle-bg)] hover:border-[#d97706] hover:text-[#d97706] transition-colors active:scale-95"
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          ) : totalResults === 0 ? (
            <div className="py-12 text-center text-[var(--paper-muted)] flex flex-col gap-2">
              <span className="font-bold text-sm text-[var(--paper-cream)] uppercase">[ NO RECORDS FOUND ]</span>
              <p className="text-xs">No dispatches or monitored channels matched &ldquo;{query}&rdquo;.</p>
            </div>
          ) : (
            <>
              {/* Channel Results */}
              {(activeTab === 'all' || activeTab === 'channels') && channels.length > 0 && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#d97706] uppercase tracking-wider border-b border-[var(--ink-border)] pb-1">
                    <Radio className="w-3 h-3" />
                    <span>CHANNELS ({channels.length})</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {channels.map((ch) => (
                      <Link
                        key={ch.id}
                        href={`/channel/${ch.id}`}
                        onClick={onClose}
                        className="p-2.5 bg-[var(--subtle-bg)] border border-[var(--ink-border)] hover:border-[#d97706] flex items-center justify-between gap-2 group transition-all active:scale-98"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={ch.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${ch.id}`}
                            alt={ch.name}
                            className="w-8 h-8 border border-[var(--ink-border)] bg-[var(--ink-bg)] object-cover shrink-0 rounded-sm"
                          />
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold text-[var(--paper-cream)] group-hover:text-[#d97706] transition-colors truncate uppercase">
                              {ch.name}
                            </span>
                            <span className="text-[10px] text-[var(--paper-muted)] truncate">@{ch.id}</span>
                          </div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-[var(--paper-muted)] group-hover:text-[#d97706] shrink-0" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Post Results */}
              {(activeTab === 'all' || activeTab === 'posts') && posts.length > 0 && (
                <div className="flex flex-col gap-2 pt-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#d97706] uppercase tracking-wider border-b border-[var(--ink-border)] pb-1">
                    <BookOpen className="w-3 h-3" />
                    <span>DISPATCHES ({posts.length})</span>
                  </div>

                  <div className="flex flex-col gap-2">
                    {posts.map((post) => {
                      const snippet = post.text
                        ? post.text.slice(0, 160) + (post.text.length > 160 ? '...' : '')
                        : '[ MEDIA TRANSMISSION ]';

                      return (
                        <Link
                          key={`${post.channel}-${post.id}`}
                          href={`/post/${post.id}?channel=${post.channel}`}
                          onClick={onClose}
                          className="p-3 bg-[var(--subtle-bg)] border border-[var(--ink-border)] hover:border-[#d97706] flex flex-col gap-1.5 group transition-all active:scale-98"
                        >
                          <div className="flex items-center justify-between text-[10px] text-[var(--paper-muted)]">
                            <span className="font-bold text-[var(--paper-cream)] uppercase group-hover:text-[#d97706] truncate">
                              @{post.channel}
                            </span>
                            <span className="shrink-0">{formatTimeAgo(post.date)}</span>
                          </div>

                          <p className="text-xs text-[var(--paper-muted)] font-sans line-clamp-2 leading-relaxed">
                            {snippet}
                          </p>

                          <div className="flex items-center justify-between text-[9px] text-[var(--paper-faint)] uppercase pt-1 border-t border-[var(--ink-border)]">
                            <span>DISPATCH #{post.id}</span>
                            <span className="group-hover:text-[#d97706] transition-colors inline-flex items-center gap-0.5 font-bold">
                              READ DISPATCH <ArrowUpRight className="w-2.5 h-2.5" />
                            </span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-3 sm:px-4 py-2 bg-[var(--subtle-bg)] border-t border-[var(--ink-border)] flex items-center justify-between text-[10px] text-[var(--paper-muted)] uppercase pb-safe">
          <span>UNIVERSAL WIRE INDEX</span>
          <span>PRESS [ ESC ] TO DISMISS</span>
        </div>
      </div>
    </div>
  );
}
