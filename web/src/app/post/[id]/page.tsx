'use client';

import React, { useState, useEffect, use, useRef } from 'react';
import { Post, Comment } from '@/lib/types';
import { PostCard } from '@/components/post-card';
import { useAuth, useToast, useRealtime } from '@/components/providers';
import { formatTimeAgo } from '@/lib/utils';
import { ArrowLeft, Loader2, Send, CornerDownRight, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function SinglePostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const postId = parseInt(resolvedParams.id, 10);
  const searchParams = useSearchParams();
  const channel = searchParams.get('channel') || 'dagmawi_babi';

  const { user } = useAuth();
  const { showToast } = useToast();
  const { subscribe } = useRealtime();

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [error, setError] = useState<string | null>(null);

  const commentsEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch Post
  useEffect(() => {
    if (isNaN(postId)) {
      setError('Invalid Post Reference');
      setLoading(false);
      return;
    }

    setLoading(true);
    fetch(`/api/posts/${postId}?channel=${channel}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.post) {
          setPost(data.post);
        } else {
          setError('Dispatch not found in broadsheet records');
        }
      })
      .catch(() => setError('Failed to load dispatch'))
      .finally(() => setLoading(false));
  }, [postId, channel]);

  // Fetch Comments
  useEffect(() => {
    if (isNaN(postId)) return;
    setCommentsLoading(true);

    fetch(`/api/posts/${postId}/comments?channel=${channel}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.comments) {
          setComments(data.comments);
        }
      })
      .catch(() => {})
      .finally(() => setCommentsLoading(false));
  }, [postId, channel]);

  // Real-time SSE comment updates
  useEffect(() => {
    if (isNaN(postId)) return;

    const unsubscribe = subscribe((event) => {
      if (
        event.type === 'new_comment' &&
        event.channel === channel &&
        event.postId === postId
      ) {
        setComments((prev) => {
          if (prev.some((c) => c.id === event.data.id)) return prev;
          return [...prev, event.data];
        });
      }
    });

    return () => unsubscribe();
  }, [channel, postId, subscribe]);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      showToast('Authentication required to enter court record', 'info');
      return;
    }
    if (!newContent.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel,
          content: newContent.trim(),
          parentId: replyTo?.id || null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setComments((prev) => {
          if (prev.some((c) => c.id === data.comment.id)) return prev;
          return [...prev, data.comment];
        });
        setNewContent('');
        setReplyTo(null);
        showToast('Court testimony filed successfully!', 'success');
        setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to enter comment', 'error');
      }
    } catch {
      showToast('Error submitting testimony', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24 text-[var(--paper-muted)] font-teletype">
        <Loader2 className="w-7 h-7 animate-spin text-[#d97706]" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 text-center broadsheet-card p-8 flex flex-col items-center gap-4 font-teletype">
        <h2 className="text-sm font-bold text-[var(--paper-cream)] uppercase">[ {error || 'DISPATCH NOT FOUND'} ]</h2>
        <Link
          href="/"
          className="stamp-btn"
        >
          RETURN TO BROADSHEET FEED
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-3 sm:px-6 py-4 sm:py-8 flex flex-col gap-6 font-teletype">
      {/* Back Button */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs text-[var(--paper-muted)] hover:text-[var(--paper-cream)] transition-colors self-start font-bold uppercase active:scale-95"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>← RETURN TO BROADSHEET FEED</span>
      </Link>

      {/* Main Post Card */}
      <PostCard post={post} />

      {/* Inline Real-time Discussion Section */}
      <div className="broadsheet-card p-4 sm:p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-[var(--ink-border)] pb-2.5">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[#d97706]" />
            <h3 className="font-bold text-xs sm:text-sm text-[var(--paper-cream)] uppercase">
              Court Testimony ({comments.length})
            </h3>
          </div>
          <span className="text-[10px] text-[var(--paper-muted)]">DISPATCH #{post.id}</span>
        </div>

        {/* Comment Composer */}
        <form onSubmit={handleSubmitComment} className="flex flex-col gap-2">
          {replyTo && (
            <div className="flex items-center justify-between px-2.5 py-1 bg-[var(--subtle-bg)] border border-[var(--ink-border)] text-[10px] text-[var(--paper-muted)]">
              <span className="truncate">
                REPLYING TO {replyTo.user?.displayName?.toUpperCase() || 'SCRIBE'}
              </span>
              <button
                type="button"
                onClick={() => setReplyTo(null)}
                className="text-[#d97706] hover:text-[var(--paper-cream)] px-1"
              >
                ✕
              </button>
            </div>
          )}

          <div className="relative flex items-center">
            <input
              ref={inputRef}
              type="text"
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder={user ? 'ENTER COURT TESTIMONY...' : 'SIGN IN TO TESTIFY...'}
              disabled={!user || submitting}
              className="w-full py-2.5 pl-3 pr-11 bg-[var(--input-bg)] border border-[var(--ink-border)] text-xs sm:text-sm text-[var(--paper-cream)] placeholder-[var(--paper-faint)] font-teletype uppercase focus:outline-none focus:border-[#d97706] disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!user || !newContent.trim() || submitting}
              aria-label="Send Testimony"
              className="stamp-btn absolute right-1 !py-1.5 !px-2.5 active:scale-95"
            >
              {submitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </form>

        {/* Comments Thread List */}
        <div className="flex flex-col gap-2.5 pt-2">
          {commentsLoading ? (
            <div className="flex items-center justify-center py-8 text-[var(--paper-muted)]">
              <Loader2 className="w-5 h-5 animate-spin text-[#d97706]" />
            </div>
          ) : comments.length === 0 ? (
            <div className="p-6 text-center text-[var(--paper-muted)] text-xs bg-[var(--subtle-bg)] border border-[var(--ink-border)]">
              [ NO COURT TESTIMONY FILED YET. BE THE FIRST SCRIBE TO TESTIFY. ]
            </div>
          ) : (
            comments.map((c) => (
              <div
                key={c.id}
                className="p-3.5 bg-[var(--subtle-bg)] border border-[var(--ink-border)] flex flex-col gap-1.5 transition-colors hover:border-[var(--paper-cream)]"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={
                        c.user?.photoUrl ||
                        `https://api.dicebear.com/7.x/bottts/svg?seed=${c.user?.displayName || c.userId}`
                      }
                      alt={c.user?.displayName || 'User'}
                      className="w-4 h-4 rounded-none bg-zinc-800 shrink-0"
                    />
                    <span className="text-xs font-bold text-[var(--paper-cream)] truncate">
                      {c.user?.displayName || 'CITIZEN SCRIBE'}
                    </span>
                    {c.user?.role === 'admin' && (
                      <span className="stamp-badge-gold stamp-badge !text-[8px] sm:!text-[9px] !py-0 !px-1 shrink-0">
                        ADMIN
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] sm:text-[10px] text-[var(--paper-muted)] shrink-0 uppercase">
                    {formatTimeAgo(c.createdAt)}
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-[var(--paper-cream)] font-sans whitespace-pre-wrap leading-relaxed break-words">
                  {c.content}
                </p>

                <button
                  onClick={() => {
                    setReplyTo(c);
                    inputRef.current?.focus();
                  }}
                  className="text-[10px] text-[#d97706] hover:underline self-start flex items-center gap-1 mt-0.5 uppercase font-bold active:scale-95"
                >
                  <CornerDownRight className="w-2.5 h-2.5" />
                  <span>REPLY</span>
                </button>
              </div>
            ))
          )}
          <div ref={commentsEndRef} />
        </div>
      </div>
    </div>
  );
}
