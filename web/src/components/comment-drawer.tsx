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
        if (onCommentAdded) onCommentAdded();
        setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to enter comment', 'error');
      }
    } catch {
      showToast('Error entering comment', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/80 backdrop-blur-sm font-teletype">
      <div className="relative w-full max-w-md h-full bg-[#12141c] border-l-2 border-[#3d4257] p-5 flex flex-col justify-between shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b-2 border-[#262936]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-[#d97706]" />
            <h3 className="font-bold text-xs text-[#f4f0e6] uppercase">
              Court Inquest Record ({comments.length})
            </h3>
            <span className="text-[10px] text-[#a39e93]">#{postId}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 border border-[#262936] text-[#a39e93] hover:text-[#f4f0e6] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Comment Thread List */}
        <div className="flex-1 overflow-y-auto py-3 flex flex-col gap-2.5">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-[#a39e93]">
              <Loader2 className="w-5 h-5 animate-spin text-[#d97706]" />
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center text-[#a39e93] gap-1">
              <p className="text-xs uppercase">[ NO COURT TESTIMONY FILED YET ]</p>
            </div>
          ) : (
            comments.map((c) => (
              <div
                key={c.id}
                className="p-3 bg-[#0c0d10] border border-[#262936] flex flex-col gap-1.5"
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
                      className="w-4 h-4 rounded-none bg-zinc-800"
                    />
                    <span className="text-xs font-bold text-[#f4f0e6]">
                      {c.user?.displayName || 'CITIZEN SCRIBE'}
                    </span>
                    {c.user?.role === 'admin' && (
                      <span className="stamp-badge-gold stamp-badge !text-[9px] !py-0 !px-1">
                        ADMIN
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-[#a39e93]">{formatTimeAgo(c.createdAt).toUpperCase()}</span>
                </div>

                <p className="text-xs text-[#f4f0e6] font-sans whitespace-pre-wrap leading-relaxed">
                  {c.content}
                </p>

                <button
                  onClick={() => setReplyTo(c)}
                  className="text-[10px] text-[#d97706] hover:underline self-start flex items-center gap-0.5 mt-0.5 uppercase font-bold"
                >
                  <CornerDownRight className="w-2.5 h-2.5" />
                  <span>REPLY</span>
                </button>
              </div>
            ))
          )}
          <div ref={commentsEndRef} />
        </div>

        {/* Comment Composer */}
        <form onSubmit={handleSubmit} className="pt-3 border-t border-[#262936] flex flex-col gap-2">
          {replyTo && (
            <div className="flex items-center justify-between px-2.5 py-1 bg-[#171a24] border border-[#262936] text-[10px] text-[#d6d0c2]">
              <span>REPLYING TO {replyTo.user?.displayName?.toUpperCase() || 'SCRIBE'}</span>
              <button
                type="button"
                onClick={() => setReplyTo(null)}
                className="text-[#d97706]"
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
              placeholder={user ? 'ENTER TESTIMONY...' : 'SIGN IN TO TESTIFY...'}
              disabled={!user || submitting}
              className="w-full py-2 pl-3 pr-10 bg-[#0c0d10] border border-[#262936] text-xs text-[#f4f0e6] placeholder-[#6b665c] font-teletype uppercase focus:outline-none focus:border-[#f4f0e6] disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!user || !newContent.trim() || submitting}
              className="stamp-btn absolute right-1 !py-1 !px-2.5"
            >
              {submitting ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Send className="w-3 h-3" />
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
