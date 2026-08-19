'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Comment } from '@/lib/types';
import { useAuth, useToast, useRealtime } from './providers';
import { formatTimeAgo } from '@/lib/utils';
import { MessageSquare, Send, X, Loader2, CornerDownRight } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-md h-full bg-[#0d0f17] border-l border-white/[0.08] p-5 flex flex-col justify-between shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 hairline-b">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-zinc-400" />
            <h3 className="font-semibold text-xs text-zinc-200">
              Discussion ({comments.length})
            </h3>
            <span className="text-[11px] text-zinc-500">#{postId}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-zinc-500 hover:text-zinc-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Comment Thread List */}
        <div className="flex-1 overflow-y-auto py-3 flex flex-col gap-2.5">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-zinc-500">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center text-zinc-500 gap-1">
              <p className="text-xs">No comments recorded yet.</p>
            </div>
          ) : (
            comments.map((c) => (
              <div
                key={c.id}
                className="p-3 rounded-lg bg-zinc-900/60 border border-white/[0.04] flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={
                        c.user?.photoUrl ||
                        `https://api.dicebear.com/7.x/bottts/svg?seed=${c.user?.displayName || c.userId}`
                      }
                      alt={c.user?.displayName || 'User'}
                      className="w-4 h-4 rounded-full bg-zinc-800"
                    />
                    <span className="text-xs font-medium text-zinc-300">
                      {c.user?.displayName || 'Subscriber'}
                    </span>
                    {c.user?.role === 'admin' && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 font-semibold">
                        Admin
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-zinc-500">{formatTimeAgo(c.createdAt)}</span>
                </div>

                <p className="text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed">
                  {c.content}
                </p>

                <button
                  onClick={() => setReplyTo(c)}
                  className="text-[10px] text-zinc-500 hover:text-zinc-300 self-start flex items-center gap-0.5 mt-0.5"
                >
                  <CornerDownRight className="w-2.5 h-2.5" />
                  <span>Reply</span>
                </button>
              </div>
            ))
          )}
          <div ref={commentsEndRef} />
        </div>

        {/* Comment Composer */}
        <form onSubmit={handleSubmit} className="pt-3 hairline-t flex flex-col gap-2">
          {replyTo && (
            <div className="flex items-center justify-between px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-400">
              <span>Replying to {replyTo.user?.displayName || 'user'}</span>
              <button
                type="button"
                onClick={() => setReplyTo(null)}
                className="text-zinc-500 hover:text-zinc-300"
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
              placeholder={user ? 'Add to discussion...' : 'Sign in to comment...'}
              disabled={!user || submitting}
              className="w-full py-2 pl-3 pr-10 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-700 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!user || !newContent.trim() || submitting}
              className="absolute right-1.5 p-1.5 rounded-md bg-zinc-100 hover:bg-white text-zinc-950 disabled:opacity-30 transition-colors"
            >
              {submitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
