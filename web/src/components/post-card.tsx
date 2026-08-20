'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Post } from '@/lib/types';
import { formatTimeAgo, formatNumber } from '@/lib/utils';
import { useAuth, useToast } from './providers';
import { Sparkles, MessageSquare, Share2, Flag, Image as ImageIcon, Video, FileText, ArrowUpRight, Heart } from 'lucide-react';
import { AIReviewModal } from './ai-review-modal';
import { CommentDrawer } from './comment-drawer';
import { ReportModal } from './report-modal';

interface PostCardProps {
  post: Post;
}

const AVAILABLE_REACTIONS = [
  { emoji: '🔥', code: 'FIRE' },
  { emoji: '🎺', code: 'DECREE' },
  { emoji: '💀', code: 'ROAST' },
  { emoji: '❤️', code: 'HONOR' },
];

/** Rich text renderer with URLs, channel mentions, and hashtags */
function RenderFormattedText({ text }: { text: string }) {
  if (!text) return <span className="italic text-[#a39e93] font-teletype text-xs">[ WIRE: NO TEXT PAYLOAD IN THIS DISPATCH ]</span>;

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
              className="text-[#f4f0e6] font-semibold underline decoration-[#d97706] hover:text-[#d97706] underline-offset-4 break-all inline-flex items-center gap-0.5 transition-colors"
            >
              <span>{part}</span>
              <ArrowUpRight className="w-3.5 h-3.5 inline text-[#d97706] opacity-80" />
            </a>
          );
        }
        if (part.match(/^@[a-zA-Z0-9_]+/)) {
          const username = part.slice(1);
          return (
            <Link
              key={index}
              href={`/channel/${username}`}
              className="font-teletype font-semibold text-[#d97706] bg-[#241c10] px-1.5 py-0.5 rounded border border-[#785a28]/60 hover:bg-[#d97706] hover:text-black transition-colors text-xs inline-block my-0.5"
            >
              {part}
            </Link>
          );
        }
        if (part.match(/^#[a-zA-Z0-9_]+/)) {
          return (
            <span key={index} className="font-teletype text-[#a39e93] bg-[#161822] px-1.5 py-0.5 rounded border border-[#262936] text-xs inline-block my-0.5">
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
      showToast('Authentication required to stamp reaction', 'info');
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
      showToast('Failed to stamp reaction', 'error');
    }
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/post/${post.id}?channel=${post.channel}`;
    navigator.clipboard.writeText(url);
    showToast('Dispatch reference copied to clipboard', 'success');
  };

  // Substack text segmentation: Title vs Body
  const lines = post.text ? post.text.trim().split('\n') : [];
  const firstLine = lines[0] || '';
  const remainingText = lines.slice(1).join('\n').trim();

  return (
    <article className="substack-card p-5 sm:p-7 rounded-2xl flex flex-col gap-4">
      {/* Substack Author / Meta Header */}
      <div className="flex items-center justify-between gap-3 border-b border-[#1f2330] pb-3.5">
        <Link
          href={`/channel/${post.channel}`}
          className="flex items-center gap-3 group/author min-w-0"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={
              post.channelInfo?.avatarUrl ||
              `https://api.dicebear.com/7.x/bottts/svg?seed=${post.channel}`
            }
            alt={post.channel}
            className="w-10 h-10 rounded-full border border-[#2e3547] bg-[#161822] object-cover shrink-0"
          />
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-sm text-[#f4f0e6] group-hover/author:text-[#d97706] transition-colors truncate max-w-[150px] sm:max-w-[240px]">
                {post.channelInfo?.name || `@${post.channel}`}
              </span>
              {post.channelInfo?.isVerified && (
                <span className="w-4 h-4 rounded-full bg-[#d97706]/20 text-[#d97706] text-[10px] font-bold inline-flex items-center justify-center">
                  ✓
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 font-teletype text-[11px] text-[#a39e93]">
              <span>@{post.channel}</span>
              <span>·</span>
              <span>{formatTimeAgo(post.date)}</span>
            </div>
          </div>
        </Link>

        {/* Telegram Direct Reference */}
        {post.permalink && (
          <a
            href={post.permalink}
            target="_blank"
            rel="noopener noreferrer"
            title="Examine on Telegram Wire"
            className="font-teletype text-[11px] text-[#a39e93] hover:text-[#f4f0e6] border border-[#1f2330] hover:border-[#2e3547] px-2.5 py-1 rounded-lg transition-colors inline-flex items-center gap-1 shrink-0"
          >
            <span>Wire</span>
            <ArrowUpRight className="w-3 h-3 text-[#d97706]" />
          </a>
        )}
      </div>

      {/* Post Body: Substack Typography */}
      <div className="flex flex-col gap-2">
        {firstLine && (
          <h2 className="font-broadsheet font-bold text-lg sm:text-xl text-[#f4f0e6] leading-snug tracking-tight">
            {firstLine}
          </h2>
        )}

        {remainingText && (
          <div className="text-[#d6d0c2] text-sm sm:text-base leading-relaxed whitespace-pre-wrap font-sans break-words pt-1">
            <RenderFormattedText text={remainingText} />
          </div>
        )}
      </div>

      {/* Media Attachment Badge */}
      {post.mediaType && post.mediaType !== 'none' && (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg font-teletype text-xs font-medium bg-[#161822] border border-[#1f2330] text-[#d6d0c2] self-start">
          {post.mediaType === 'photo' && <ImageIcon className="w-3.5 h-3.5 text-[#d97706]" />}
          {post.mediaType === 'video' && <Video className="w-3.5 h-3.5 text-[#d97706]" />}
          {post.mediaType === 'document' && <FileText className="w-3.5 h-3.5 text-[#d97706]" />}
          <span className="uppercase tracking-wider">{post.mediaType} Attachment</span>
        </div>
      )}

      {/* Substack Engagement & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3.5 border-t border-[#1f2330]">
        {/* Reactions */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {AVAILABLE_REACTIONS.map(({ emoji }) => {
            const count = reactions[emoji] || 0;
            const isSelected = userReactions.includes(emoji);
            return (
              <button
                key={emoji}
                onClick={() => handleToggleReaction(emoji)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-teletype font-semibold rounded-full border transition-all ${
                  isSelected
                    ? 'bg-[#d97706] text-black border-[#d97706] shadow-sm'
                    : 'bg-[#151822] text-[#d6d0c2] border-[#1f2330] hover:border-[#2e3547] hover:text-[#f4f0e6]'
                }`}
              >
                <span>{emoji}</span>
                {count > 0 && <span className="text-[11px]">{formatNumber(count)}</span>}
              </button>
            );
          })}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* AI Review */}
          <button
            onClick={() => setIsAIModalOpen(true)}
            className="px-3 py-1 text-xs font-teletype font-semibold rounded-full border border-[#785a28]/60 bg-[#241c10] text-[#f6d89b] hover:bg-[#d97706] hover:text-black transition-all flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Brief</span>
          </button>

          {/* Comment Drawer */}
          <button
            onClick={() => setIsCommentDrawerOpen(true)}
            className="px-3 py-1 text-xs font-teletype font-medium rounded-full border border-[#1f2330] bg-[#151822] text-[#a39e93] hover:text-[#f4f0e6] hover:border-[#2e3547] transition-all flex items-center gap-1.5"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>{commentCount}</span>
          </button>

          {/* Share Link */}
          <button
            onClick={handleCopyLink}
            title="Copy Reference"
            className="p-1.5 rounded-full border border-[#1f2330] hover:border-[#2e3547] text-[#a39e93] hover:text-[#f4f0e6] hover:bg-[#151822] transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>

          {/* Report */}
          <button
            onClick={() => setIsReportModalOpen(true)}
            title="File Inquest"
            className="p-1.5 rounded-full border border-[#1f2330] hover:border-rose-500/50 text-[#a39e93] hover:text-rose-400 hover:bg-[#151822] transition-colors"
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
