'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Post } from '@/lib/types';
import { formatTimeAgo, formatNumber } from '@/lib/utils';
import { useAuth, useToast } from './providers';
import { Sparkles, MessageSquare, Share2, Flag, Image as ImageIcon, Video, FileText, ArrowUpRight } from 'lucide-react';
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
              className="text-[#f4f0e6] font-bold underline decoration-[#d97706] hover:text-[#d97706] underline-offset-4 break-all inline-flex items-center gap-0.5 transition-colors"
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
              className="font-teletype font-bold text-[#d97706] bg-[#241c10] px-1.5 py-0.5 border border-[#785a28] hover:bg-[#d97706] hover:text-black transition-colors text-xs inline-block my-0.5"
            >
              {part}
            </Link>
          );
        }
        if (part.match(/^#[a-zA-Z0-9_]+/)) {
          return (
            <span key={index} className="font-teletype text-[#a39e93] bg-[#171a24] px-1.5 py-0.5 border border-[#262936] text-xs inline-block my-0.5">
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
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

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

  // Text segmentation: Title vs Body
  const lines = post.text ? post.text.trim().split('\n') : [];
  const firstLine = lines[0] || '';
  const remainingText = lines.slice(1).join('\n').trim();

  // Check if post is lengthy
  const isLongPost = (post.text && post.text.length > 280) || lines.length > 4;

  return (
    <article className="broadsheet-card p-5 sm:p-7 flex flex-col gap-4 font-teletype">
      {/* Broadsheet Author / Meta Header */}
      <div className="flex items-center justify-between gap-3 border-b-2 border-[#262936] pb-3">
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
            className="w-10 h-10 border-2 border-[#262936] bg-[#12141c] object-cover shrink-0"
          />
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-sm text-[#f4f0e6] group-hover/author:text-[#d97706] transition-colors truncate uppercase max-w-[150px] sm:max-w-[240px]">
                {post.channelInfo?.name || `@${post.channel}`}
              </span>
              {post.channelInfo?.isVerified && (
                <span className="text-[#d97706] text-xs font-bold">
                  [V]
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[10px] text-[#a39e93] uppercase">
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
            className="stamp-btn !py-1 !px-2.5 !text-[10px] flex items-center gap-1 shrink-0"
          >
            <span>WIRE</span>
            <ArrowUpRight className="w-3 h-3 text-[#d97706]" />
          </a>
        )}
      </div>

      {/* Post Body with Clean Broadsheet Expansion */}
      <div className="flex flex-col gap-2">
        {firstLine && (
          <h2 className="font-broadsheet font-bold text-xl sm:text-2xl text-[#f4f0e6] leading-tight tracking-tight">
            {firstLine}
          </h2>
        )}

        {remainingText && (
          <div className="relative">
            <div
              className={`text-[#d6d0c2] text-sm leading-relaxed whitespace-pre-wrap font-sans break-words pt-1 transition-all duration-200 ${
                !isExpanded && isLongPost ? 'max-h-36 overflow-hidden' : ''
              }`}
            >
              <RenderFormattedText text={remainingText} />
            </div>

            {/* Gradient Fade & Expand Button when Collapsed */}
            {!isExpanded && isLongPost && (
              <div className="absolute inset-x-0 bottom-0 pt-16 bg-gradient-to-t from-[#12141c] via-[#12141c]/90 to-transparent flex items-end justify-center pb-0.5">
                <button
                  onClick={() => setIsExpanded(true)}
                  className="stamp-btn !bg-[#171a24] !text-[#d97706] hover:!bg-[#d97706] hover:!text-black !py-1.5 !px-4 !text-xs font-bold shadow-[2px_2px_0px_0px_#000000]"
                >
                  <span>↓ READ FULL DISPATCH ({lines.length} LINES)</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Collapse Button when Expanded */}
        {isExpanded && isLongPost && (
          <div className="pt-2 flex justify-start">
            <button
              onClick={() => setIsExpanded(false)}
              className="stamp-btn !bg-[#12141c] !text-[#a39e93] hover:!text-[#f4f0e6] !py-1 !px-3 !text-[10px] font-bold"
            >
              <span>↑ COLLAPSE DISPATCH</span>
            </button>
          </div>
        )}
      </div>

      {/* Media Attachment Badge */}
      {post.mediaType && post.mediaType !== 'none' && (
        <div className="inline-flex items-center gap-2 px-2.5 py-1 text-xs font-bold bg-[#171a24] border border-[#262936] text-[#d6d0c2] self-start uppercase">
          {post.mediaType === 'photo' && <ImageIcon className="w-3.5 h-3.5 text-[#d97706]" />}
          {post.mediaType === 'video' && <Video className="w-3.5 h-3.5 text-[#d97706]" />}
          {post.mediaType === 'document' && <FileText className="w-3.5 h-3.5 text-[#d97706]" />}
          <span>{post.mediaType} ATTACHMENT</span>
        </div>
      )}

      {/* Engagement & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3.5 border-t border-[#262936]">
        {/* Reactions */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {AVAILABLE_REACTIONS.map(({ emoji }) => {
            const count = reactions[emoji] || 0;
            const isSelected = userReactions.includes(emoji);
            return (
              <button
                key={emoji}
                onClick={() => handleToggleReaction(emoji)}
                className={`stamp-btn !py-1 !px-2.5 !text-xs ${
                  isSelected ? '!bg-[#d97706] !text-black !border-[#d97706]' : ''
                }`}
              >
                <span>{emoji}</span>
                {count > 0 && <span>{formatNumber(count)}</span>}
              </button>
            );
          })}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* AI Review */}
          <button
            onClick={() => setIsAIModalOpen(true)}
            className="stamp-btn !bg-[#241c10] !border-[#785a28] !text-[#f6d89b] hover:!bg-[#d97706] hover:!text-black !py-1 !px-2.5 flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#d97706]" />
            <span>AI BRIEF</span>
          </button>

          {/* Comment Drawer */}
          <button
            onClick={() => setIsCommentDrawerOpen(true)}
            className="stamp-btn !py-1 !px-2.5 flex items-center gap-1.5"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>{commentCount}</span>
          </button>

          {/* Share Link */}
          <button
            onClick={handleCopyLink}
            title="Copy Reference"
            className="stamp-btn !p-1.5"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>

          {/* Report */}
          <button
            onClick={() => setIsReportModalOpen(true)}
            title="File Inquest"
            className="stamp-btn !p-1.5 hover:!bg-rose-950/40 hover:!text-rose-400"
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
