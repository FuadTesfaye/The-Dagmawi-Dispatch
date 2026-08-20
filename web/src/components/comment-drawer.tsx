'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Comment } from '@/lib/types';
import { useAuth, useToast, useRealtime } from './providers';
import { formatTimeAgo } from '@/lib/utils';
import { Send, X, Loader2, CornerDownRight } from 'lucide-react';

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
  const inputRef = useRef<HTMLInputElement>(null);

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

  // Escape key handler & scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-end bg-black/80 backdrop-blur-sm font-teletype animate-in fade-in duration-150 cursor-pointer"
      onClick={onClose}
    >
      {/* Mobile Bottom-Sheet or Desktop Right-Drawer */}
      <div
        className="relative w-full sm:max-w-md h-[88vh] sm:h-full bg-[var(--card-bg)] border-t-2 sm:border-t-0 sm:border-l-2 border-[var(--ink-border-heavy)] p-4 sm:p-5 flex flex-col justify-between shadow-2xl animate-in slide-in-from-bottom sm:slide-in-from-right duration-200 cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drag Indicator Bar */}
        <div className="sm:hidden w-12 h-1 bg-[var(--ink-border)] rounded-full mx-auto -mt-1 mb-2" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b-2 border-[var(--ink-border)]">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-[#d97706] shrink-0" />
            <h3 className="font-bold text-xs sm:text-sm text-[var(--paper-cream)] uppercase truncate">
              Court Testimony ({comments.length})
            </h3>
            <span className="text-[10px] text-[var(--paper-muted)] shrink-0">#{postId}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 border border-[var(--ink-border)] text-[var(--paper-muted)] hover:text-[var(--paper-cream)] hover:bg-[var(--subtle-bg)] transition-colors active:scale-95 shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Comment Thread List */}
        <div className="flex-1 overflow-y-auto py-3 flex flex-col gap-2.5 no-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-2 text-[var(--paper-muted)]">
              <Loader2 className="w-5 h-5 animate-spin text-[#d97706]" />
              <span className="text-[11px] uppercase">[ RETRIEVING COURT RECORDS... ]</span>
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center text-[var(--paper-muted)] gap-2">
              <span className="text-2xl">📜</span>
              <p className="text-xs uppercase font-bold">[ NO COURT TESTIMONY FILED YET ]</p>
              <p className="text-[11px] font-sans max-w-xs text-[var(--paper-faint)]">
                Be the first scribe to enter a record on this dispatch.
              </p>
            </div>
          ) : (
            comments.map((c) => (
              <div
                key={c.id}
                className="p-3 bg-[var(--subtle-bg)] border border-[var(--ink-border)] flex flex-col gap-1.5 transition-colors hover:border-[var(--paper-cream)]"
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

        {/* Comment Composer */}
        <form onSubmit={handleSubmit} className="pt-2 border-t border-[var(--ink-border)] flex flex-col gap-2 pb-safe">
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
              placeholder={user ? 'ENTER TESTIMONY...' : 'SIGN IN TO TESTIFY...'}
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
      </div>
    </div>
  );
}
