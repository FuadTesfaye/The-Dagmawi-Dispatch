'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Post } from '@/lib/types';
import { formatTimeAgo, formatNumber } from '@/lib/utils';
import { useAuth, useToast } from './providers';
import { Sparkles, MessageSquare, ExternalLink, Share2, Flag, Image as ImageIcon, Video, FileText, ArrowUpRight } from 'lucide-react';
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

/** Broadsheet styled rich text renderer */
function RenderFormattedText({ text }: { text: string }) {
  if (!text) return <span className="italic text-[#a39e93] font-teletype text-xs">[ WIRE: NO TEXT PAYLOAD IN THIS DISPATCH ]</span>;

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
              className="text-[#f4f0e6] font-bold underline decoration-[#d97706] hover:text-[#d97706] underline-offset-4 break-all inline-flex items-center gap-0.5"
            >
              <span>{part}</span>
              <ArrowUpRight className="w-3.5 h-3.5 inline text-[#d97706]" />
            </a>
          );
        }
        if (part.match(/^@[a-zA-Z0-9_]+/)) {
          const username = part.slice(1);
          return (
            <Link
              key={index}
              href={`/channel/${username}`}
              className="font-teletype font-bold text-[#d97706] bg-[#241c10] px-1 py-0.5 border border-[#785a28] hover:bg-[#d97706] hover:text-black transition-colors text-xs inline-block my-0.5"
            >
              {part}
            </Link>
          );
        }
        if (part.match(/^#[a-zA-Z0-9_]+/)) {
          return (
            <span key={index} className="font-teletype text-[#a39e93] bg-[#161822] px-1 py-0.5 border border-[#262936] text-xs inline-block my-0.5">
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

  return (
    <article className="broadsheet-card p-4 sm:p-6 flex flex-col gap-3.5 sm:gap-4 overflow-hidden">
      {/* Broadsheet Meta Bar */}
      <div className="flex items-start sm:items-center justify-between gap-2 border-b-2 border-[#262936] pb-3">
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
            className="w-9 h-9 sm:w-10 sm:h-10 border-2 border-[#3d4257] bg-[#12141c] object-cover shrink-0"
          />
          <div className="flex flex-col font-teletype min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-xs text-[#f4f0e6] group-hover/author:text-[#d97706] transition-colors uppercase truncate max-w-[130px] sm:max-w-[200px]">
                {post.channelInfo?.name || `@${post.channel}`}
              </span>
              {post.channelInfo?.isVerified && (
                <span className="text-[9px] text-[#d97706] font-bold">
                  [V]
                </span>
              )}
            </div>
            <span className="text-[10px] text-[#a39e93] truncate">
              #{post.id} · {formatTimeAgo(post.date).toUpperCase()}
            </span>
          </div>
        </Link>

        {/* Telegram Direct Reference */}
        {post.permalink && (
          <a
            href={post.permalink}
            target="_blank"
            rel="noopener noreferrer"
            title="Examine on Telegram Wire"
            className="font-teletype text-[9px] sm:text-[10px] uppercase text-[#a39e93] hover:text-[#f4f0e6] border border-[#262936] px-1.5 sm:px-2 py-1 hover:border-[#f4f0e6] transition-colors shrink-0"
          >
            ↗ WIRE
          </a>
        )}
      </div>

      {/* Dispatch Body */}
      <div className="text-[#f4f0e6] text-xs sm:text-sm sm:leading-relaxed leading-normal whitespace-pre-wrap font-sans break-words">
        <RenderFormattedText text={post.text || ''} />
      </div>

      {/* Media Type Stamp if present */}
      {post.mediaType && post.mediaType !== 'none' && (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 font-teletype text-[9px] sm:text-[10px] font-bold uppercase bg-[#171a24] border border-[#262936] text-[#d6d0c2] self-start">
          {post.mediaType === 'photo' && <ImageIcon className="w-3 h-3 text-[#d97706]" />}
          {post.mediaType === 'video' && <Video className="w-3 h-3 text-[#d97706]" />}
          {post.mediaType === 'document' && <FileText className="w-3 h-3 text-[#d97706]" />}
          <span>[ {post.mediaType} ATTACHMENT ]</span>
        </div>
      )}

      {/* Broadsheet Action & Reaction Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-[#262936]">
        {/* Tactile Reaction Stamps */}
        <div className="flex items-center gap-1 flex-wrap">
          {AVAILABLE_REACTIONS.map(({ emoji, code }) => {
            const count = reactions[emoji] || 0;
            const isSelected = userReactions.includes(emoji);
            return (
              <button
                key={emoji}
                onClick={() => handleToggleReaction(emoji)}
                className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-teletype font-bold border transition-all ${
                  isSelected
                    ? 'bg-[#d97706] text-black border-[#d97706] shadow-[1px_1px_0px_0px_#000000]'
                    : 'bg-[#171a24] text-[#d6d0c2] border-[#262936] hover:border-[#f4f0e6] hover:text-[#f4f0e6]'
                }`}
              >
                <span>{emoji}</span>
                {count > 0 && <span className="text-[11px]">{formatNumber(count)}</span>}
              </button>
            );
          })}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          {/* AI Review */}
          <button
            onClick={() => setIsAIModalOpen(true)}
            className="stamp-btn flex items-center gap-1 !text-[10px] !py-1 !px-2"
          >
            <Sparkles className="w-3 h-3 text-[#d97706]" />
            <span>AI BRIEF</span>
          </button>

          {/* Comment Drawer */}
          <button
            onClick={() => setIsCommentDrawerOpen(true)}
            className="stamp-btn !bg-[#12141c] flex items-center gap-1 !text-[10px] !py-1 !px-2"
          >
            <MessageSquare className="w-3 h-3" />
            <span>RECORD ({commentCount})</span>
          </button>

          {/* Share Link */}
          <button
            onClick={handleCopyLink}
            title="Copy Reference"
            className="p-1 border border-[#262936] hover:border-[#f4f0e6] text-[#a39e93] hover:text-[#f4f0e6] transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>

          {/* Report */}
          <button
            onClick={() => setIsReportModalOpen(true)}
            title="File Court Inquest"
            className="p-1 border border-[#262936] hover:border-rose-500 text-[#a39e93] hover:text-rose-400 transition-colors"
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
