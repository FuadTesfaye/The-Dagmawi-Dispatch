'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Post } from '@/lib/types';
import { formatTimeAgo, formatNumber } from '@/lib/utils';
import { useAuth, useToast } from './providers';
import { MessageSquare, Sparkles, Share2, Flag, ExternalLink, Image as ImageIcon, Video, FileText } from 'lucide-react';
import { AIReviewModal } from './ai-review-modal';
import { CommentDrawer } from './comment-drawer';
import { ReportModal } from './report-modal';

interface PostCardProps {
  post: Post;
  onReactionToggle?: (postId: number, emoji: string) => void;
}

const AVAILABLE_REACTIONS = [
  { emoji: '🔥', label: 'Fire' },
  { emoji: '🎺', label: 'Trumpet' },
  { emoji: '💀', label: 'Savage' },
  { emoji: '❤️', label: 'Respect' },
];

export function PostCard({ post }: PostCardProps) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [reactions, setReactions] = useState<Record<string, number>>(post.reactions || {});
  const [userReactions, setUserReactions] = useState<string[]>(post.userReactions || []);
  const [commentCount, setCommentCount] = useState<number>(post.commentCount || 0);

  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isCommentDrawerOpen, setIsCommentDrawerOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const handleToggleReaction = async (emoji: string) => {
    if (!user) {
      showToast('Please sign in to react to posts', 'info');
      return;
    }

    const hasReacted = userReactions.includes(emoji);

    // Optimistic UI update
    setUserReactions((prev) =>
      hasReacted ? prev.filter((e) => e !== emoji) : [...prev, emoji]
    );
    setReactions((prev) => ({
      ...prev,
      [emoji]: Math.max(0, (prev[emoji] || 0) + (hasReacted ? -1 : 1)),
    }));

    try {
      const res = await fetch(`/api/posts/${post.id}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji, channel: post.channel }),
      });

      if (res.ok) {
        const data = await res.json();
        setReactions(data.reactions);
        setUserReactions(data.userReactions);
      }
    } catch {
      showToast('Failed to toggle reaction', 'error');
    }
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/post/${post.id}?channel=${post.channel}`;
    navigator.clipboard.writeText(url);
    showToast('Post link copied to clipboard!', 'success');
  };

  return (
    <article className="glass-panel rounded-3xl p-5 sm:p-6 transition-all duration-300 hover:border-zinc-700/80 flex flex-col gap-4 relative overflow-hidden group">
      {/* Post Header */}
      <div className="flex items-center justify-between gap-3">
        <Link
          href={`/channel/${post.channel}`}
          className="flex items-center gap-3 group/author"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={
              post.channelInfo?.avatarUrl ||
              `https://api.dicebear.com/7.x/bottts/svg?seed=${post.channel}`
            }
            alt={post.channel}
            className="w-10 h-10 rounded-2xl bg-zinc-800 border border-zinc-700/50 object-cover group-hover/author:scale-105 transition-transform"
          />
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm text-zinc-100 group-hover/author:text-amber-400 transition-colors">
                {post.channelInfo?.name || `@${post.channel}`}
              </span>
              {post.channelInfo?.isVerified && (
                <span className="text-amber-400 text-xs" title="Verified Kingdom Channel">
                  ✓
                </span>
              )}
            </div>
            <span className="text-xs text-zinc-400">
              @{post.channel} · {formatTimeAgo(post.date)}
            </span>
          </div>
        </Link>

        {/* Telegram Direct Link */}
        {post.permalink && (
          <a
            href={post.permalink}
            target="_blank"
            rel="noopener noreferrer"
            title="Open in Telegram"
            className="text-zinc-500 hover:text-amber-400 transition-colors p-2 rounded-xl hover:bg-zinc-900"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>

      {/* Post Text Content */}
      <div className="text-zinc-200 text-sm sm:text-base leading-relaxed whitespace-pre-wrap font-sans">
        {post.text || <span className="italic text-zinc-500">No caption dispatch</span>}
      </div>

      {/* Media Type Badge if present */}
      {post.mediaType && post.mediaType !== 'none' && (
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs text-zinc-400 self-start">
          {post.mediaType === 'photo' && <ImageIcon className="w-3.5 h-3.5 text-amber-400" />}
          {post.mediaType === 'video' && <Video className="w-3.5 h-3.5 text-amber-400" />}
          {post.mediaType === 'document' && <FileText className="w-3.5 h-3.5 text-amber-400" />}
          <span className="capitalize font-medium">{post.mediaType} Dispatch</span>
        </div>
      )}

      {/* Action Bar (Reactions, Comments, AI Review, Share) */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-zinc-800/80">
        {/* Emoji Reactions */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {AVAILABLE_REACTIONS.map(({ emoji, label }) => {
            const count = reactions[emoji] || 0;
            const isSelected = userReactions.includes(emoji);
            return (
              <button
                key={emoji}
                onClick={() => handleToggleReaction(emoji)}
                title={label}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200 ${
                  isSelected
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 scale-105'
                    : 'bg-zinc-900/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 border border-zinc-800'
                }`}
              >
                <span>{emoji}</span>
                {count > 0 && <span>{formatNumber(count)}</span>}
              </button>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* AI Review Trigger */}
          <button
            onClick={() => setIsAIModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-all hover:scale-105"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Review</span>
          </button>

          {/* Comment Drawer Trigger */}
          <button
            onClick={() => setIsCommentDrawerOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 border border-zinc-800 transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>{commentCount > 0 ? formatNumber(commentCount) : 'Reply'}</span>
          </button>

          {/* Copy Link */}
          <button
            onClick={handleCopyLink}
            title="Copy link"
            className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition-colors"
          >
            <Share2 className="w-4 h-4" />
          </button>

          {/* Report Button */}
          <button
            onClick={() => setIsReportModalOpen(true)}
            title="Report to Court"
            className="p-1.5 rounded-full text-zinc-500 hover:text-rose-400 hover:bg-zinc-900 transition-colors"
          >
            <Flag className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Modals & Drawers */}
      {isAIModalOpen && (
        <AIReviewModal
          isOpen={isAIModalOpen}
          onClose={() => setIsAIModalOpen(false)}
          post={post}
        />
      )}

      {isCommentDrawerOpen && (
        <CommentDrawer
          isOpen={isCommentDrawerOpen}
          onClose={() => setIsCommentDrawerOpen(false)}
          postId={post.id}
          channel={post.channel}
          onCommentAdded={() => setCommentCount((c) => c + 1)}
        />
      )}

      {isReportModalOpen && (
        <ReportModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          targetType="post"
          channel={post.channel}
          postId={post.id}
        />
      )}
    </article>
  );
}
