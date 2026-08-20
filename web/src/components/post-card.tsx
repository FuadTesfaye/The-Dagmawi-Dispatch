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
  { emoji: '🔥', code: 'FIRE', label: 'Fire' },
  { emoji: '🎺', code: 'DECREE', label: 'Decree' },
  { emoji: '💀', code: 'ROAST', label: 'Roast' },
  { emoji: '❤️', code: 'HONOR', label: 'Honor' },
];

/** Rich text renderer with URLs, channel mentions, and hashtags */
function RenderFormattedText({ text }: { text: string }) {
  if (!text) {
    return <span className="italic text-[#a39e93] font-teletype text-xs">[ WIRE: NO TEXT PAYLOAD IN THIS DISPATCH ]</span>;
  }

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
              <ArrowUpRight className="w-3 h-3 inline text-[#d97706] opacity-80 shrink-0" />
            </a>
          );
        }
        if (part.match(/^@[a-zA-Z0-9_]+/)) {
          const username = part.slice(1);
          return (
            <Link
              key={index}
              href={`/channel/${username}`}
              className="font-teletype font-bold text-[#d97706] bg-[#241c10] px-1.5 py-0.5 border border-[#785a28] hover:bg-[#d97706] hover:text-black transition-colors text-[11px] sm:text-xs inline-block my-0.5 active:scale-95 rounded-sm"
            >
              {part}
            </Link>
          );
        }
        if (part.match(/^#[a-zA-Z0-9_]+/)) {
          return (
            <span key={index} className="font-teletype text-[#a39e93] bg-[#171a24] px-1.5 py-0.5 border border-[#262936] text-[11px] sm:text-xs inline-block my-0.5 rounded-sm">
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
  const [lastTappedEmoji, setLastTappedEmoji] = useState<string | null>(null);
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

    // Trigger haptic vibration on mobile devices if supported
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(35);
    }

    setLastTappedEmoji(emoji);
    setTimeout(() => setLastTappedEmoji(null), 300);

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

  const handleShare = async () => {
    const url = `${window.location.origin}/post/${post.id}?channel=${post.channel}`;
    const shareData = {
      title: `Dispatch #${post.id} from @${post.channel} — The Lurkening`,
      text: post.text ? post.text.slice(0, 120) + '...' : `Dispatch #${post.id} from @${post.channel}`,
      url: url,
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          // Fall through to clipboard
        } else {
          return;
        }
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      showToast('Dispatch reference link copied to clipboard!', 'success');
    } catch {
      showToast('Failed to copy link', 'error');
    }
  };

  // Text segmentation: Title vs Body
  const lines = post.text ? post.text.trim().split('\n') : [];
  const firstLine = lines[0] || '';
  const remainingText = lines.slice(1).join('\n').trim();

  // Check if post is lengthy
  const isLongPost = (post.text && post.text.length > 240) || lines.length > 3;

  return (
    <article className="broadsheet-card p-4 sm:p-6 flex flex-col gap-3.5 sm:gap-4 font-teletype relative group">
      {/* Broadsheet Author / Meta Header */}
      <div className="flex items-center justify-between gap-2.5 border-b-2 border-[#262936] pb-3">
        <Link
          href={`/channel/${post.channel}`}
          className="flex items-center gap-2.5 sm:gap-3 group/author min-w-0"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={
              post.channelInfo?.avatarUrl ||
              `https://api.dicebear.com/7.x/bottts/svg?seed=${post.channel}`
            }
            alt={post.channel}
            className="w-9 h-9 sm:w-10 sm:h-10 border-2 border-[#262936] bg-[#12141c] object-cover shrink-0 rounded-sm"
          />
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-xs sm:text-sm text-[#f4f0e6] group-hover/author:text-[#d97706] transition-colors truncate uppercase max-w-[130px] xs:max-w-[180px] sm:max-w-[280px]">
                {post.channelInfo?.name || `@${post.channel}`}
              </span>
              {post.channelInfo?.isVerified && (
                <span className="text-[#d97706] text-[10px] sm:text-xs font-bold" title="Verified Publication">
                  [V]
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] text-[#a39e93] uppercase">
              <span className="truncate">@{post.channel}</span>
              <span>·</span>
              <span className="shrink-0">{formatTimeAgo(post.date)}</span>
            </div>
          </div>
        </Link>

        {/* Telegram Direct Reference */}
        {post.permalink && (
          <a
            href={post.permalink}
            target="_blank"
            rel="noopener noreferrer"
            title="Examine original on Telegram"
            className="stamp-btn !py-1 !px-2 text-[10px] flex items-center gap-1 shrink-0 active:scale-95"
          >
            <span>WIRE</span>
            <ArrowUpRight className="w-3 h-3 text-[#d97706]" />
          </a>
        )}
      </div>

      {/* Post Body with Responsive Typography */}
      <div className="flex flex-col gap-2">
        {firstLine && (
          <h2 className="font-broadsheet font-bold text-lg sm:text-2xl text-[#f4f0e6] leading-tight tracking-tight break-words">
            {firstLine}
          </h2>
        )}

        {remainingText && (
          <div className="relative">
            <div
              className={`text-[#d6d0c2] text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans break-words pt-1 transition-all duration-200 ${
                !isExpanded && isLongPost ? 'max-h-36 overflow-hidden' : ''
              }`}
            >
              <RenderFormattedText text={remainingText} />
            </div>

            {/* Gradient Fade & Expand Button when Collapsed */}
            {!isExpanded && isLongPost && (
              <div className="absolute inset-x-0 bottom-0 pt-14 bg-gradient-to-t from-[#12141c] via-[#12141c]/90 to-transparent flex items-end justify-center pb-0.5">
                <button
                  onClick={() => setIsExpanded(true)}
                  className="stamp-btn !bg-[#171a24] !text-[#d97706] hover:!bg-[#d97706] hover:!text-black !py-1.5 !px-3.5 !text-[11px] font-bold shadow-[2px_2px_0px_0px_#000000] active:scale-95"
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
              className="stamp-btn !bg-[#12141c] !text-[#a39e93] hover:!text-[#f4f0e6] !py-1 !px-3 !text-[10px] font-bold active:scale-95"
            >
              <span>↑ COLLAPSE DISPATCH</span>
            </button>
          </div>
        )}
      </div>

      {/* Media Attachment Badge */}
      {post.mediaType && post.mediaType !== 'none' && (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold bg-[#171a24] border border-[#262936] text-[#d6d0c2] self-start uppercase rounded-sm">
          {post.mediaType === 'photo' && <ImageIcon className="w-3.5 h-3.5 text-[#d97706]" />}
          {post.mediaType === 'video' && <Video className="w-3.5 h-3.5 text-[#d97706]" />}
          {post.mediaType === 'document' && <FileText className="w-3.5 h-3.5 text-[#d97706]" />}
          <span>{post.mediaType} ATTACHMENT</span>
        </div>
      )}

      {/* Social Engagement & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-[#262936]">
        {/* Reactions (Thumb-friendly row) */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
          {AVAILABLE_REACTIONS.map(({ emoji, label }) => {
            const count = reactions[emoji] || 0;
            const isSelected = userReactions.includes(emoji);
            const isPopping = lastTappedEmoji === emoji;

            return (
              <button
                key={emoji}
                onClick={() => handleToggleReaction(emoji)}
                aria-label={`Reaction ${label}`}
                className={`stamp-btn !py-1 !px-2 sm:!px-2.5 text-xs select-none active:scale-90 ${
                  isSelected ? '!bg-[#d97706] !text-black !border-[#d97706]' : ''
                } ${isPopping ? 'animate-reaction-pop' : ''}`}
              >
                <span className="text-sm sm:text-xs leading-none">{emoji}</span>
                {count > 0 && <span className="font-bold text-[10px] sm:text-xs">{formatNumber(count)}</span>}
              </button>
            );
          })}
        </div>

        {/* Social Actions (AI Brief, Comments, Share, Report) */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* AI Review */}
          <button
            onClick={() => setIsAIModalOpen(true)}
            className="stamp-btn !bg-[#241c10] !border-[#785a28] !text-[#f6d89b] hover:!bg-[#d97706] hover:!text-black !py-1 !px-2 sm:!px-2.5 flex items-center gap-1 text-[11px] sm:text-xs active:scale-95"
            title="Groq AI Brief & Roast"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#d97706]" />
            <span className="font-bold">AI BRIEF</span>
          </button>

          {/* Comment Drawer Trigger */}
          <button
            onClick={() => setIsCommentDrawerOpen(true)}
            className="stamp-btn !py-1 !px-2 sm:!px-2.5 flex items-center gap-1 text-[11px] sm:text-xs active:scale-95"
            title="Court Inquest Comments"
          >
            <MessageSquare className="w-3.5 h-3.5 text-[#a39e93]" />
            <span className="font-bold">{commentCount}</span>
          </button>

          {/* Social Share Link */}
          <button
            onClick={handleShare}
            title="Share Dispatch"
            aria-label="Share Dispatch"
            className="stamp-btn !p-1.5 active:scale-95"
          >
            <Share2 className="w-3.5 h-3.5 text-[#a39e93] hover:text-[#f4f0e6]" />
          </button>

          {/* Report Citation */}
          <button
            onClick={() => setIsReportModalOpen(true)}
            title="File Inquest Citation"
            aria-label="Report"
            className="stamp-btn !p-1.5 hover:!bg-rose-950/40 hover:!text-rose-400 active:scale-95"
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
