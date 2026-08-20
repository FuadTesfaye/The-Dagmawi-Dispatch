'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Post } from '@/lib/types';
import { formatTimeAgo, formatNumber } from '@/lib/utils';
import { useAuth, useToast } from './providers';
import { Sparkles, MessageSquare, Share2, Flag, Image as ImageIcon, Video, FileText, ArrowUpRight, Forward, CornerDownRight, Link2, Copy, Check, Bell, BellOff } from 'lucide-react';
import { AIReviewModal } from './ai-review-modal';
import { CommentDrawer } from './comment-drawer';
import { ReportModal } from './report-modal';
import { ShareModal } from './share-modal';
import { useChannelMute } from '@/lib/mute-store';

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
const RenderFormattedText = React.memo(function RenderFormattedText({ text }: { text: string }) {
  if (!text) {
    return <span className="italic text-[var(--paper-faint)] font-teletype text-xs">[ WIRE: NO TEXT PAYLOAD IN THIS DISPATCH ]</span>;
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
              className="text-[var(--paper-cream)] font-semibold underline decoration-[#d97706] hover:text-[#d97706] underline-offset-4 break-all inline-flex items-center gap-0.5 transition-colors"
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
              className="font-teletype font-bold text-[#d97706] bg-[#241c10]/10 px-1.5 py-0.5 border border-[#785a28]/40 hover:bg-[#d97706] hover:text-black transition-colors text-[11px] sm:text-xs inline-block my-0.5 active:scale-95 rounded-sm"
            >
              {part}
            </Link>
          );
        }
        if (part.match(/^#[a-zA-Z0-9_]+/)) {
          return (
            <span key={index} className="font-teletype text-[var(--paper-muted)] bg-[var(--subtle-bg)] px-1.5 py-0.5 border border-[var(--ink-border)] text-[11px] sm:text-xs inline-block my-0.5 rounded-sm">
              {part}
            </span>
          );
        }
        return part;
      })}
    </>
  );
});

export const PostCard = React.memo(function PostCard({ post }: PostCardProps) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [reactions, setReactions] = useState<Record<string, number>>(post.reactions || {});
  const [userReactions, setUserReactions] = useState<string[]>(post.userReactions || []);
  const [lastTappedEmoji, setLastTappedEmoji] = useState<string | null>(null);
  const [commentCount, setCommentCount] = useState<number>(post.commentCount || 0);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState(false);

  const { isMuted, toggle: toggleMute } = useChannelMute(post.channel);

  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isCommentDrawerOpen, setIsCommentDrawerOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Extract Forward Information (top-level or rawJson fallback)
  const forwardFrom = post.forwardFrom || (post.rawJson as any)?.forwardFrom || ((post.rawJson as any)?.fwdFrom ? {
    name: (post.rawJson as any).fwdFrom.fromName || (post.rawJson as any).fwdFrom.postAuthor || 'Forwarded Channel',
    channel: (post.rawJson as any).fwdFrom.channelPost ? String((post.rawJson as any).fwdFrom.channelPost) : undefined,
    postId: typeof (post.rawJson as any).fwdFrom.channelPost === 'number' ? (post.rawJson as any).fwdFrom.channelPost : undefined,
  } : ((post.rawJson as any)?.forward_from_chat ? {
    name: (post.rawJson as any).forward_from_chat.title || `@${(post.rawJson as any).forward_from_chat.username}`,
    channel: (post.rawJson as any).forward_from_chat.username,
    postId: (post.rawJson as any).forward_from_message_id,
    url: (post.rawJson as any).forward_from_chat.username ? `https://t.me/${(post.rawJson as any).forward_from_chat.username}` : undefined,
  } : ((post.rawJson as any)?.forward_from ? {
    name: (post.rawJson as any).forward_from.first_name || 'Forwarded Author',
    channel: (post.rawJson as any).forward_from.username,
  } : undefined)));

  // Extract Reply Information (top-level or rawJson fallback)
  const replyTo = post.replyTo || (post.rawJson as any)?.replyTo || ((post.rawJson as any)?.replyToMsgId ? {
    id: (post.rawJson as any).replyToMsgId,
    channel: post.channel,
  } : ((post.rawJson as any)?.reply_to_message ? {
    id: (post.rawJson as any).reply_to_message.message_id,
    channel: (post.rawJson as any).reply_to_message.chat?.username || post.channel,
    authorName: (post.rawJson as any).reply_to_message.from?.first_name || (post.rawJson as any).reply_to_message.chat?.title,
    text: (post.rawJson as any).reply_to_message.text,
  } : undefined));

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

  const handleCopyIdPermalink = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/post/${post.id}?channel=${post.channel}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(true);
      showToast(`Copied permalink for Dispatch #${post.id}!`, 'success');
      setTimeout(() => setCopiedId(false), 2000);
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
      {/* Broadsheet Author & Dispatch ID Masthead Header */}
      <div className="flex items-center justify-between gap-2.5 border-b-2 border-[var(--ink-border)] pb-3">
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
            className="w-9 h-9 sm:w-10 sm:h-10 border-2 border-[var(--ink-border)] bg-[var(--ink-bg)] object-cover shrink-0 rounded-sm"
          />
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-xs sm:text-sm text-[var(--paper-cream)] group-hover/author:text-[#d97706] transition-colors truncate uppercase max-w-[130px] xs:max-w-[180px] sm:max-w-[280px]">
                {post.channelInfo?.name || `@${post.channel}`}
              </span>
              {post.channelInfo?.isVerified && (
                <span className="text-[#d97706] text-[10px] sm:text-xs font-bold" title="Verified Publication">
                  [V]
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] text-[var(--paper-muted)] uppercase">
              <span className="truncate">@{post.channel}</span>
              <span>·</span>
              <span className="shrink-0" suppressHydrationWarning>{formatTimeAgo(post.date)}</span>
            </div>
          </div>
        </Link>

        {/* Dispatch ID Stamp & External Wire Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Channel Mute/Unmute Quick Action */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleMute().then((next) => {
                showToast(next ? `Muted @${post.channel}` : `Unmuted @${post.channel}`, next ? 'info' : 'success');
              });
            }}
            title={isMuted ? `Unmute @${post.channel}` : `Mute @${post.channel}`}
            className={`stamp-btn !py-1 !px-1.5 text-[10px] flex items-center gap-1 shrink-0 active:scale-95 transition-colors ${
              isMuted
                ? '!bg-red-950/70 !text-red-300 !border-red-600/50 hover:!bg-red-900/60'
                : '!bg-[var(--subtle-bg)] !text-[var(--paper-muted)] hover:!text-[var(--paper-cream)]'
            }`}
          >
            {isMuted ? <BellOff className="w-3 h-3 text-red-400" /> : <Bell className="w-3 h-3" />}
          </button>

          {/* Distinct Dispatch ID Stamp */}
          <button
            onClick={handleCopyIdPermalink}
            title={`Dispatch #${post.id} (Click to copy direct permalink)`}
            className="stamp-btn !py-1 !px-2 text-[10px] flex items-center gap-1 active:scale-95 font-bold !bg-[var(--subtle-bg)] hover:!bg-[#d97706] hover:!text-black"
          >
            {copiedId ? (
              <>
                <Check className="w-3 h-3 text-emerald-500" />
                <span>COPIED</span>
              </>
            ) : (
              <>
                <span className="text-[#d97706] font-bold">#</span>
                <span>{post.id}</span>
              </>
            )}
          </button>

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
      </div>

      {/* Forwarded Wire Origin Callout (When Post is Forwarded) */}
      {forwardFrom && (
        <div className="flex items-center gap-2 px-3 py-2 bg-[var(--subtle-bg)] border-l-4 border-[#d97706] border-y border-r border-[var(--ink-border)] text-xs font-teletype rounded-sm">
          <Forward className="w-3.5 h-3.5 text-[#d97706] shrink-0" />
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            <span className="text-[10px] font-bold text-[var(--paper-muted)] uppercase tracking-wider">
              FORWARDED WIRE FROM:
            </span>
            {forwardFrom.channel ? (
              <Link
                href={`/channel/${forwardFrom.channel}`}
                className="font-bold text-[var(--paper-cream)] hover:text-[#d97706] underline decoration-dotted transition-colors truncate"
              >
                {forwardFrom.name} (@{forwardFrom.channel})
              </Link>
            ) : forwardFrom.url ? (
              <a
                href={forwardFrom.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-[var(--paper-cream)] hover:text-[#d97706] underline decoration-dotted transition-colors truncate inline-flex items-center gap-1"
              >
                <span>{forwardFrom.name}</span>
                <ArrowUpRight className="w-3 h-3 text-[#d97706]" />
              </a>
            ) : (
              <span className="font-bold text-[var(--paper-cream)] truncate">{forwardFrom.name}</span>
            )}
            {forwardFrom.postId && (
              <span className="text-[10px] text-[var(--paper-faint)]">
                [REF #{forwardFrom.postId}]
              </span>
            )}
          </div>
        </div>
      )}

      {/* Replied-To Dispatch Quote Box (When Post is a Reply) */}
      {replyTo && (
        <Link
          href={`/post/${replyTo.id}?channel=${replyTo.channel || post.channel}`}
          className="flex flex-col gap-1 p-2.5 bg-[var(--subtle-bg)]/80 hover:bg-[var(--subtle-bg)] border-l-4 border-[var(--ink-border-heavy)] border-y border-r border-[var(--ink-border)] text-xs transition-all group/reply rounded-sm"
        >
          <div className="flex items-center justify-between text-[10px] text-[var(--paper-muted)] font-bold uppercase tracking-wider">
            <span className="inline-flex items-center gap-1 text-[#d97706]">
              <CornerDownRight className="w-3 h-3 shrink-0" />
              <span>IN REPLY TO DISPATCH #{replyTo.id}</span>
              {replyTo.authorName && <span>· {replyTo.authorName}</span>}
            </span>
            <span className="text-[9px] text-[var(--paper-faint)] group-hover/reply:text-[#d97706] transition-colors">
              VIEW PARENT DISPATCH →
            </span>
          </div>
          {replyTo.text && (
            <p className="text-xs text-[var(--paper-muted)] font-sans italic line-clamp-2 pl-3 border-l-2 border-[var(--ink-border)]">
              &ldquo;{replyTo.text}&rdquo;
            </p>
          )}
        </Link>
      )}

      {/* Post Body with Responsive Typography */}
      <div className="flex flex-col gap-2">
        {firstLine && (
          <h2 className="font-broadsheet font-bold text-lg sm:text-2xl text-[var(--paper-cream)] leading-tight tracking-tight break-words">
            {firstLine}
          </h2>
        )}

        {remainingText && (
          <div className="relative">
            <div
              className={`text-[var(--paper-muted)] text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans break-words pt-1 transition-all duration-200 ${
                !isExpanded && isLongPost ? 'max-h-36 overflow-hidden' : ''
              }`}
            >
              <RenderFormattedText text={remainingText} />
            </div>

            {/* Gradient Fade & Expand Button when Collapsed */}
            {!isExpanded && isLongPost && (
              <div className="absolute inset-x-0 bottom-0 pt-14 bg-gradient-to-t from-[var(--card-bg)] via-[var(--card-bg)]/90 to-transparent flex items-end justify-center pb-0.5">
                <button
                  onClick={() => setIsExpanded(true)}
                  className="stamp-btn !bg-[var(--subtle-bg)] !text-[#d97706] hover:!bg-[#d97706] hover:!text-black !py-1.5 !px-3.5 !text-[11px] font-bold shadow-[2px_2px_0px_0px_var(--shadow-color)] active:scale-95"
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
              className="stamp-btn !bg-[var(--card-bg)] !text-[var(--paper-muted)] hover:!text-[var(--paper-cream)] !py-1 !px-3 !text-[10px] font-bold active:scale-95"
            >
              <span>↑ COLLAPSE DISPATCH</span>
            </button>
          </div>
        )}
      </div>

      {/* Media Attachment Badge */}
      {post.mediaType && post.mediaType !== 'none' && (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold bg-[var(--subtle-bg)] border border-[var(--ink-border)] text-[var(--paper-muted)] self-start uppercase rounded-sm">
          {post.mediaType === 'photo' && <ImageIcon className="w-3.5 h-3.5 text-[#d97706]" />}
          {post.mediaType === 'video' && <Video className="w-3.5 h-3.5 text-[#d97706]" />}
          {post.mediaType === 'document' && <FileText className="w-3.5 h-3.5 text-[#d97706]" />}
          <span>{post.mediaType} ATTACHMENT</span>
        </div>
      )}

      {/* Social Engagement & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-[var(--ink-border)]">
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
            onClick={() => setIsShareModalOpen(true)}
            title="Disseminate Dispatch (Share / Copy)"
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
      {isShareModalOpen && (
        <ShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          post={post}
        />
      )}

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
});
