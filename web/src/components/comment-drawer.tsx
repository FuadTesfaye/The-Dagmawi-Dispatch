'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Comment } from '@/lib/types';
import { useAuth, useToast, useRealtime } from './providers';
import { formatTimeAgo } from '@/lib/utils';
import { MessageSquare, Send, X, Loader2, CornerDownRight, Crown } from 'lucide-react';

interface CommentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  postId: number;
  channel: string;
  onCommentAdded?: () => void;
}

export function CommentDrawer({
  isOpen,
  onClose,
  postId,
  channel,
  onCommentAdded,
}: CommentDrawerProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { subscribe } = useRealtime();

  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [replyTo, setReplyTo] = useState<Comment | null>(null);

  const commentsEndRef = useRef<HTMLDivElement>(null);

  // Load comments
  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);

    fetch(`/api/posts/${postId}/comments?channel=${channel}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.comments) {
          setComments(data.comments);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isOpen, postId, channel]);

  // Subscribe to live SSE events for this post
  useEffect(() => {
    if (!isOpen) return;

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
  }, [isOpen, channel, postId, subscribe]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      showToast('Please sign in to post a comment', 'info');
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
        if (onCommentAdded) onCommentAdded();
        showToast('Comment published to court!', 'success');
        setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to post comment', 'error');
      }
    } catch {
      showToast('Error posting comment', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-zinc-950/85 backdrop-blur-xl animate-in fade-in">
      <div className="relative w-full max-w-md h-full glass-card bg-zinc-950/98 border-l border-zinc-800 p-5 sm:p-6 shadow-2xl flex flex-col justify-between">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-zinc-100">
                Discussions ({comments.length})
              </h3>
              <p className="text-[11px] text-zinc-400 font-medium">Post #{postId} · @{channel}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition-colors border border-transparent hover:border-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Comment Thread List */}
        <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-3">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-amber-400">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center text-zinc-500 gap-2">
              <span className="text-3xl">📜</span>
              <p className="text-xs font-medium">No comments yet. Be the first to speak in court!</p>
            </div>
          ) : (
            comments.map((c) => (
              <div
                key={c.id}
                className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800/80 flex flex-col gap-2 transition-all hover:border-zinc-700/80 shadow-sm animate-in fade-in"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={
                        c.user?.photoUrl ||
                        `https://api.dicebear.com/7.x/bottts/svg?seed=${c.user?.displayName || c.userId}`
                      }
                      alt={c.user?.displayName || 'User'}
                      className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700/50"
                    />
                    <span className="text-xs font-bold text-zinc-200">
                      {c.user?.displayName || 'Anonymous Scribe'}
                    </span>
                    {c.user?.role === 'admin' && (
                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-extrabold border border-amber-500/40">
                        <Crown className="w-2.5 h-2.5" />
                        Admin
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-zinc-500 font-medium">{formatTimeAgo(c.createdAt)}</span>
                </div>

                <p className="text-xs sm:text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed font-sans">
                  {c.content}
                </p>

                <button
                  onClick={() => setReplyTo(c)}
                  className="text-[11px] font-semibold text-zinc-500 hover:text-amber-400 self-start flex items-center gap-1 mt-1 transition-colors"
                >
                  <CornerDownRight className="w-3 h-3" />
                  <span>Reply</span>
                </button>
              </div>
            ))
          )}
          <div ref={commentsEndRef} />
        </div>

        {/* Comment Composer */}
        <form onSubmit={handleSubmit} className="pt-3 border-t border-zinc-800/80 flex flex-col gap-2">
          {replyTo && (
            <div className="flex items-center justify-between px-3.5 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-xs text-amber-300 font-semibold">
              <span>Replying to {replyTo.user?.displayName || 'Scribe'}</span>
              <button
                type="button"
                onClick={() => setReplyTo(null)}
                className="text-amber-400 hover:text-amber-200"
              >
                ✕
              </button>
            </div>
          )}

          <div className="relative flex items-center">
            <input
              type="text"
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder={user ? 'Write a royal comment...' : 'Sign in to join discussion...'}
              disabled={!user || submitting}
              className="w-full py-3 pl-4 pr-12 rounded-2xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500/50 disabled:opacity-50 font-medium"
            />
            <button
              type="submit"
              disabled={!user || !newContent.trim() || submitting}
              className="absolute right-2 p-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-zinc-950 disabled:opacity-30 transition-all shadow-sm"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
