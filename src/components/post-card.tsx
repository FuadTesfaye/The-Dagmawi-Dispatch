'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Post } from '@/lib/types';
import { formatTimeAgo, formatNumber } from '@/lib/utils';
import { useAuth, useToast } from './providers';
import {
  Sparkles,
  MessageSquare,
  Share2,
  Image as ImageIcon,
  Video,
  FileText,
  ArrowUpRight,
  Forward,
  CornerDownRight,
  Check,
  Bell,
  BellOff,
} from 'lucide-react';
import { AIReviewModal } from './ai-review-modal';
import { CommentDrawer } from './comment-drawer';
import { ShareModal } from './share-modal';
import { useChannelMute } from '@/lib/mute-store';

interface PostCardProps {
  post: Post;
}

const AVAILABLE_REACTIONS = [
  { emoji: '🔥', code: 'FIRE', label: 'Fire' },
  { emoji: '💡', code: 'INSIGHT', label: 'Insight' },
  { emoji: '💀', code: 'ROAST', label: 'Roast' },
  { emoji: '❤️', code: 'HEART', label: 'Heart' },
];

/** Rich text renderer with URLs, channel mentions, and hashtags */
const RenderFormattedText = React.memo(function RenderFormattedText({ text }: { text: string }) {
  if (!text) {
    return <span className="italic text-[var(--paper-faint)] text-xs">[Media transmission without caption]</span>;
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
              className="text-[#d97706] hover:underline break-all inline-flex items-center gap-0.5 transition-colors font-medium"
            >
              <span>{part}</span>
              <ArrowUpRight className="w-3 h-3 inline opacity-80 shrink-0" />
            </a>
          );
        }
        if (part.match(/^@[a-zA-Z0-9_]+/)) {
          const username = part.slice(1);
          return (
            <Link
              key={index}
              href={`/channel/${username}`}
              className="text-[#d97706] hover:underline font-medium inline-block"
            >
              {part}
            </Link>
          );
        }
        if (part.match(/^#[a-zA-Z0-9_]+/)) {
          return (
            <span key={index} className="text-[var(--paper-muted)] font-medium inline-block">
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
  const { user, triggerHaptic } = useAuth();
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
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Extract Forward Information
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

  // Extract Reply Information
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
      showToast('Sign in to react to dispatches', 'info');
      return;
    }

    triggerHaptic('light');
    setLastTappedEmoji(emoji);
    setTimeout(() => setLastTappedEmoji(null), 250);

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
      showToast('Failed to record reaction', 'error');
    }
  };

  const handleCopyPermalink = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/post/${post.id}?channel=${post.channel}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(true);
      triggerHaptic('selection');
      showToast(`Link copied to clipboard`, 'success');
      setTimeout(() => setCopiedId(false), 2000);
    } catch {
      showToast('Failed to copy link', 'error');
    }
  };

  const textContent = post.text ? post.text.trim() : '';
  const lines = textContent ? textContent.split('\n') : [];
  const isLongPost = textContent.length > 280 || lines.length > 4;

  // ─── HIGH-VALUE INTELLIGENCE FILTER ────────────────────────────
  // Only offer AI review button if post is substantive (>140 chars or has complex external link)
  // Eliminates useless AI summarizing on "morning" or 1-liner posts!
  const hasComplexLink = /(https?:\/\/[^\s]+)/.test(textContent);
  const shouldOfferAIAnalysis = textContent.length >= 140 || hasComplexLink;

  return (
    <article className="broadsheet-card p-4 sm:p-5 flex flex-col gap-3 font-sans relative group transition-all">
      {/* Clean Author & Header */}
      <div className="flex items-center justify-between gap-2.5 border-b border-[var(--ink-border)] pb-2.5">
        <Link
          href={`/channel/${post.channel}`}
          className="flex items-center gap-2.5 group/author min-w-0"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={
              post.channelInfo?.avatarUrl ||
              `https://api.dicebear.com/7.x/bottts/svg?seed=${post.channel}`
            }
            alt={post.channel}
            className="w-9 h-9 border border-[var(--ink-border)] bg-[var(--ink-bg)] object-cover shrink-0 rounded-full"
          />
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-xs sm:text-sm text-[var(--paper-cream)] group-hover/author:text-[#d97706] transition-colors truncate">
                {post.channelInfo?.name || `@${post.channel}`}
              </span>
              {post.channelInfo?.isVerified && (
                <span className="text-[#d97706] text-xs font-bold" title="Verified Channel">
                  ✓
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-[var(--paper-muted)] font-mono">
              <span>@{post.channel}</span>
              <span>·</span>
              <span suppressHydrationWarning>{formatTimeAgo(post.date)}</span>
            </div>
          </div>
        </Link>

        {/* Clean Header Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleMute().then((next) => {
                showToast(next ? `Muted @${post.channel}` : `Unmuted @${post.channel}`, next ? 'info' : 'success');
              });
            }}
            title={isMuted ? `Unmute @${post.channel}` : `Mute @${post.channel}`}
            className="p-1.5 text-[var(--paper-muted)] hover:text-[var(--paper-cream)] transition-colors rounded"
          >
            {isMuted ? <BellOff className="w-3.5 h-3.5 text-red-400" /> : <Bell className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={handleCopyPermalink}
            title="Copy link"
            className="p-1.5 text-[var(--paper-muted)] hover:text-[var(--paper-cream)] transition-colors rounded text-xs font-mono"
          >
            {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <span>#{post.id}</span>}
          </button>

          {post.permalink && (
            <a
              href={post.permalink}
              target="_blank"
              rel="noopener noreferrer"
              title="Open on Telegram"
              className="p-1.5 text-[var(--paper-muted)] hover:text-[#d97706] transition-colors rounded"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* Forwarded Header (if forwarded) */}
      {forwardFrom && (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[var(--subtle-bg)] border border-[var(--ink-border)] text-xs text-[var(--paper-muted)] rounded-sm">
          <Forward className="w-3.5 h-3.5 text-[#d97706] shrink-0" />
          <span className="text-[11px] font-semibold text-[var(--paper-muted)]">Forwarded from:</span>
          {forwardFrom.channel ? (
            <Link
              href={`/channel/${forwardFrom.channel}`}
              className="font-bold text-[var(--paper-cream)] hover:text-[#d97706] truncate"
            >
              {forwardFrom.name} (@{forwardFrom.channel})
            </Link>
          ) : (
            <span className="font-bold text-[var(--paper-cream)] truncate">{forwardFrom.name}</span>
          )}
        </div>
      )}

      {/* In-Reply-To Header (if reply) */}
      {replyTo && (
        <Link
          href={`/post/${replyTo.id}?channel=${replyTo.channel || post.channel}`}
          className="flex flex-col gap-1 p-2 bg-[var(--subtle-bg)]/60 hover:bg-[var(--subtle-bg)] border-l-2 border-[#d97706] border-y border-r border-[var(--ink-border)] text-xs transition-all rounded-sm"
        >
          <div className="flex items-center justify-between text-[10px] text-[var(--paper-muted)] font-mono">
            <span className="inline-flex items-center gap-1 text-[#d97706]">
              <CornerDownRight className="w-3 h-3 shrink-0" />
              <span>In reply to #{replyTo.id} {replyTo.authorName && `· ${replyTo.authorName}`}</span>
            </span>
          </div>
          {replyTo.text && (
            <p className="text-xs text-[var(--paper-muted)] line-clamp-1">
              &ldquo;{replyTo.text}&rdquo;
            </p>
          )}
        </Link>
      )}

      {/* Post Text Body */}
      <div className="flex flex-col gap-1.5">
        <div className="relative">
          <div
            className={`text-[var(--paper-cream)] text-sm leading-relaxed whitespace-pre-wrap break-words transition-all ${
              !isExpanded && isLongPost ? 'max-h-40 overflow-hidden' : ''
            }`}
          >
            <RenderFormattedText text={textContent} />
          </div>

          {/* Expand Gradient on Long Posts */}
          {!isExpanded && isLongPost && (
            <div className="absolute inset-x-0 bottom-0 pt-12 bg-gradient-to-t from-[var(--card-bg)] via-[var(--card-bg)]/80 to-transparent flex items-end justify-center pb-0.5">
              <button
                onClick={() => setIsExpanded(true)}
                className="px-3 py-1 bg-[var(--subtle-bg)] hover:bg-[var(--paper-cream)] hover:text-black border border-[var(--ink-border)] text-xs font-bold text-[#d97706] rounded-sm shadow-sm transition-all"
              >
                Read full dispatch ↓
              </button>
            </div>
          )}
        </div>

        {/* Collapse Button when Expanded */}
        {isExpanded && isLongPost && (
          <div className="pt-1">
            <button
              onClick={() => setIsExpanded(false)}
              className="text-xs text-[var(--paper-muted)] hover:text-[var(--paper-cream)] font-mono"
            >
              ↑ Collapse
            </button>
          </div>
        )}
      </div>

      {/* Media Attachment Badge */}
      {post.mediaType && post.mediaType !== 'none' && (
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium bg-[var(--subtle-bg)] border border-[var(--ink-border)] text-[var(--paper-muted)] self-start rounded-sm">
          {post.mediaType === 'photo' && <ImageIcon className="w-3.5 h-3.5 text-[#d97706]" />}
          {post.mediaType === 'video' && <Video className="w-3.5 h-3.5 text-[#d97706]" />}
          {post.mediaType === 'document' && <FileText className="w-3.5 h-3.5 text-[#d97706]" />}
          <span className="capitalize">{post.mediaType} Attachment</span>
        </div>
      )}

      {/* Clean Social Engagement & Action Bar */}
      <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-[var(--ink-border)]">
        {/* Reactions (Thumb-friendly row) */}
        <div className="flex items-center gap-1">
          {AVAILABLE_REACTIONS.map(({ emoji, label }) => {
            const count = reactions[emoji] || 0;
            const isSelected = userReactions.includes(emoji);
            const isPopping = lastTappedEmoji === emoji;

            return (
              <button
                key={emoji}
                onClick={() => handleToggleReaction(emoji)}
                aria-label={`Reaction ${label}`}
                className={`px-2 py-1 border text-xs flex items-center gap-1 rounded-sm transition-all active:scale-90 ${
                  isSelected
                    ? 'bg-[#d97706] text-black border-[#d97706] font-bold'
                    : 'bg-[var(--subtle-bg)] text-[var(--paper-muted)] border-[var(--ink-border)] hover:border-[var(--paper-muted)]'
                } ${isPopping ? 'scale-110' : ''}`}
              >
                <span>{emoji}</span>
                {count > 0 && <span className="font-mono text-[11px]">{formatNumber(count)}</span>}
              </button>
            );
          })}
        </div>

        {/* Right Tools: Comments, AI Takeaway (when substantive), Share */}
        <div className="flex items-center gap-1.5">
          {/* AI Takeaway Button (ONLY rendered when post has substantive content) */}
          {shouldOfferAIAnalysis && (
            <button
              onClick={() => setIsAIModalOpen(true)}
              className="px-2.5 py-1 bg-amber-950/40 border border-amber-500/50 text-amber-300 hover:bg-amber-900/60 transition-colors flex items-center gap-1 text-xs font-medium rounded-sm"
              title="Key Takeaways & AI Analysis"
            >
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>AI Takeaway</span>
            </button>
          )}

          {/* Comments Button */}
          <button
            onClick={() => setIsCommentDrawerOpen(true)}
            className="px-2 py-1 border border-[var(--ink-border)] bg-[var(--subtle-bg)] text-[var(--paper-muted)] hover:text-[var(--paper-cream)] flex items-center gap-1 text-xs rounded-sm transition-colors"
            title="Comments"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="font-mono">{commentCount}</span>
          </button>

          {/* Share Button */}
          <button
            onClick={() => setIsShareModalOpen(true)}
            title="Share"
            aria-label="Share Dispatch"
            className="p-1.5 border border-[var(--ink-border)] bg-[var(--subtle-bg)] text-[var(--paper-muted)] hover:text-[var(--paper-cream)] rounded-sm transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Sub-Modals */}
      <AIReviewModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        post={post}
      />

      <CommentDrawer
        isOpen={isCommentDrawerOpen}
        onClose={() => setIsCommentDrawerOpen(false)}
        postId={post.id}
        channel={post.channel}
        onCommentAdded={() => setCommentCount((c) => c + 1)}
      />

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        post={post}
      />
    </article>
  );
});
