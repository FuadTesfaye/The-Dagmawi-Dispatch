'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Post } from '@/lib/types';
import { formatTimeAgo, formatNumber } from '@/lib/utils';
import { useAuth, useToast } from './providers';
import { MessageSquare, Sparkles, Share2, Flag, ExternalLink, Image as ImageIcon, Video, FileText, ArrowUpRight } from 'lucide-react';
import { AIReviewModal } from './ai-review-modal';
import { CommentDrawer } from './comment-drawer';
import { ReportModal } from './report-modal';

interface PostCardProps {
  post: Post;
}

const AVAILABLE_REACTIONS = [
  { emoji: '🔥', label: 'Fire' },
  { emoji: '🎺', label: 'Trumpet' },
  { emoji: '💀', label: 'Savage' },
  { emoji: '❤️', label: 'Respect' },
];

/** Clean editorial text renderer */
function RenderFormattedText({ text }: { text: string }) {
  if (!text) return <span className="italic text-zinc-500 text-xs">No text caption in this dispatch</span>;

  // Split text by URLs, Telegram mentions (@channel), and hashtags (#tag)
  const parts = text.split(/(https?:\/\/[^\s]+|@[a-zA-Z0-9_]+|#[a-zA-Z0-9_]+)/g);

  return (
    <>
      {parts.map((part, index) => {
        if (part.match(/^https?:\/\//)) {
          return (
            <a
              key={index}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-200 hover:text-white underline decoration-zinc-600 hover:decoration-zinc-300 underline-offset-4 break-all inline-flex items-center gap-0.5 font-medium"
            >
              <span>{part}</span>
              <ArrowUpRight className="w-3 h-3 inline text-zinc-500" />
            </a>
          );
        }
        if (part.match(/^@[a-zA-Z0-9_]+/)) {
          const username = part.slice(1);
          return (
            <Link
              key={index}
              href={`/channel/${username}`}
              className="text-zinc-300 hover:text-white font-semibold underline decoration-zinc-700 hover:decoration-zinc-400 underline-offset-2"
            >
              {part}
            </Link>
          );
        }
        if (part.match(/^#[a-zA-Z0-9_]+/)) {
          return (
            <span key={index} className="text-zinc-400 font-medium">
              {part}
            </span>
          );
        }
        return part;
      })}
    </>
  );
}

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
    showToast('Link copied to clipboard', 'success');
  };

  return (
    <article className="editorial-card p-5 sm:p-6 flex flex-col gap-4">
      {/* Header */}
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
            className="w-9 h-9 rounded-lg bg-zinc-800 border border-zinc-800 object-cover"
          />
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm text-zinc-200 group-hover/author:text-white transition-colors">
                {post.channelInfo?.name || `@${post.channel}`}
              </span>
              {post.channelInfo?.isVerified && (
                <span className="text-zinc-400 text-xs font-bold" title="Verified Channel">
                  ✓
                </span>
              )}
            </div>
            <span className="text-xs text-zinc-500">
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
            className="text-zinc-500 hover:text-zinc-300 p-1.5 rounded-md hover:bg-zinc-900 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>

      {/* Post Content */}
      <div className="text-zinc-200 text-sm leading-relaxed whitespace-pre-wrap font-normal">
        <RenderFormattedText text={post.text || ''} />
      </div>

      {/* Media Type Badge */}
      {post.mediaType && post.mediaType !== 'none' && (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 self-start">
          {post.mediaType === 'photo' && <ImageIcon className="w-3.5 h-3.5 text-zinc-400" />}
          {post.mediaType === 'video' && <Video className="w-3.5 h-3.5 text-zinc-400" />}
          {post.mediaType === 'document' && <FileText className="w-3.5 h-3.5 text-zinc-400" />}
          <span className="capitalize">{post.mediaType} Media</span>
        </div>
      )}

      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 hairline-t">
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
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  isSelected
                    ? 'bg-zinc-800 text-white border border-zinc-700 font-semibold'
                    : 'bg-zinc-900/90 text-zinc-400 hover:text-zinc-200 border border-zinc-800/80 hover:border-zinc-700'
                }`}
              >
                <span>{emoji}</span>
                {count > 0 && <span className="text-[11px]">{formatNumber(count)}</span>}
              </button>
            );
          })}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* AI Review Trigger */}
          <button
            onClick={() => setIsAIModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold text-zinc-200 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:text-white transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
            <span>AI Brief</span>
          </button>

          {/* Comments Drawer Trigger */}
          <button
            onClick={() => setIsCommentDrawerOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5 text-zinc-500" />
            <span>{commentCount > 0 ? formatNumber(commentCount) : 'Reply'}</span>
          </button>

          {/* Copy Link */}
          <button
            onClick={handleCopyLink}
            title="Copy link"
            className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>

          {/* Report Button */}
          <button
            onClick={() => setIsReportModalOpen(true)}
            title="Report"
            className="p-1.5 rounded-md text-zinc-600 hover:text-zinc-400 hover:bg-zinc-900 transition-colors"
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
