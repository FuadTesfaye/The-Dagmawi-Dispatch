'use client';

import React, { useState } from 'react';
import { Post } from '@/lib/types';
import { useToast } from './providers';
import { X, Copy, Check, Share2, Send, Link2, Quote, Globe } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: Post;
}

export function ShareModal({ isOpen, onClose, post }: ShareModalProps) {
  const { showToast } = useToast();
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCitation, setCopiedCitation] = useState(false);

  if (!isOpen) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const postUrl = `${origin}/post/${post.id}?channel=${post.channel}`;
  const snippet = post.text ? post.text.slice(0, 160) : `Dispatch #${post.id}`;
  const shareText = `✦ Dispatch #${post.id} by @${post.channel} — The Lurkening\n\n"${snippet}"`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(postUrl);
      setCopiedLink(true);
      showToast('Dispatch URL copied to clipboard!', 'success');
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      showToast('Failed to copy URL', 'error');
    }
  };

  const handleCopyCitation = async () => {
    const citation = `“${post.text || `[Dispatch #${post.id}]`}”\n— @${post.channel}, Dispatch #${post.id} · The Lurkening\n${postUrl}`;
    try {
      await navigator.clipboard.writeText(citation);
      setCopiedCitation(true);
      showToast('Broadsheet citation copied to clipboard!', 'success');
      setTimeout(() => setCopiedCitation(false), 2000);
    } catch {
      showToast('Failed to copy citation', 'error');
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Dispatch #${post.id} · @${post.channel}`,
          text: shareText,
          url: postUrl,
        });
        onClose();
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  const telegramShareUrl = `https://t.me/share/url?url=${encodeURIComponent(postUrl)}&text=${encodeURIComponent(shareText)}`;
  const twitterShareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(postUrl)}&text=${encodeURIComponent(`Dispatch #${post.id} from @${post.channel} via @lurkening_bot`)}`;

  // Escape key handler & scroll lock
  React.useEffect(() => {
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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm font-teletype animate-in fade-in duration-150 cursor-pointer"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-[var(--card-bg)] border-2 border-[var(--ink-border-heavy)] p-4 sm:p-6 shadow-[6px_6px_0px_0px_var(--shadow-color)] sm:shadow-[8px_8px_0px_0px_var(--shadow-color)] flex flex-col gap-4 animate-in zoom-in-95 duration-150 cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-[var(--ink-border)] pb-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <Share2 className="w-4 h-4 text-[#d97706] shrink-0" />
            <div className="min-w-0">
              <h3 className="font-bold text-xs sm:text-sm text-[var(--paper-cream)] uppercase truncate">
                Disseminate Dispatch
              </h3>
              <p className="text-[10px] text-[var(--paper-muted)] truncate">
                DISPATCH #{post.id} · @{post.channel}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 border border-[var(--ink-border)] text-[var(--paper-muted)] hover:text-[var(--paper-cream)] hover:bg-[var(--subtle-bg)] transition-colors active:scale-95 shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dispatch Preview Box */}
        <div className="p-3 bg-[var(--subtle-bg)] border border-[var(--ink-border)] flex flex-col gap-1 text-xs">
          <div className="flex items-center justify-between text-[10px] text-[var(--paper-muted)] uppercase font-bold">
            <span>@{post.channel}</span>
            <span className="stamp-badge stamp-badge-gold !text-[8px] !py-0 !px-1">#{post.id}</span>
          </div>
          <p className="text-xs text-[var(--paper-muted)] font-sans line-clamp-2 italic">
            &ldquo;{snippet}&rdquo;
          </p>
        </div>

        {/* Share Action Channels */}
        <div className="flex flex-col gap-2">
          {/* Telegram Share Button */}
          <a
            href={telegramShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="stamp-btn !bg-[#241c10] !border-[#785a28] !text-[#f6d89b] hover:!bg-[#d97706] hover:!text-black flex items-center justify-between p-2.5 text-xs font-bold active:scale-95 transition-all"
          >
            <div className="flex items-center gap-2">
              <Send className="w-4 h-4 text-[#d97706]" />
              <span>TRANSMIT TO TELEGRAM CHAT / CHANNEL</span>
            </div>
            <span className="text-[10px] opacity-75">1-TAP →</span>
          </a>

          {/* Copy Link */}
          <button
            onClick={handleCopyLink}
            className="stamp-btn flex items-center justify-between p-2.5 text-xs font-bold active:scale-95"
          >
            <div className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-[#d97706]" />
              <span>COPY DIRECT DISPATCH LINK</span>
            </div>
            {copiedLink ? (
              <span className="text-[10px] text-emerald-500 font-bold inline-flex items-center gap-1">
                <Check className="w-3 h-3" /> COPIED
              </span>
            ) : (
              <Copy className="w-3.5 h-3.5 text-[var(--paper-muted)]" />
            )}
          </button>

          {/* Copy Formatted Citation */}
          <button
            onClick={handleCopyCitation}
            className="stamp-btn flex items-center justify-between p-2.5 text-xs font-bold active:scale-95"
          >
            <div className="flex items-center gap-2">
              <Quote className="w-4 h-4 text-[#d97706]" />
              <span>COPY BROADSHEET CITATION</span>
            </div>
            {copiedCitation ? (
              <span className="text-[10px] text-emerald-500 font-bold inline-flex items-center gap-1">
                <Check className="w-3 h-3" /> COPIED
              </span>
            ) : (
              <Copy className="w-3.5 h-3.5 text-[var(--paper-muted)]" />
            )}
          </button>

          {/* X / Twitter Share */}
          <a
            href={twitterShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="stamp-btn !bg-[var(--subtle-bg)] !text-[var(--paper-muted)] hover:!text-[var(--paper-cream)] flex items-center justify-between p-2.5 text-xs font-bold active:scale-95"
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 fill-current text-[#d97706]" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              <span>POST TO X (TWITTER)</span>
            </div>
            <span className="text-[10px] opacity-75">SHARE →</span>
          </a>

          {/* Native OS Share (if supported) */}
          {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
            <button
              onClick={handleNativeShare}
              className="stamp-btn !bg-[var(--card-bg)] !text-[var(--paper-muted)] hover:!text-[var(--paper-cream)] flex items-center justify-between p-2.5 text-xs font-bold active:scale-95"
            >
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 text-[#d97706]" />
                <span>MORE DEVICE SHARE OPTIONS</span>
              </div>
              <span className="text-[10px] opacity-75">OS SHEET →</span>
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-[9px] sm:text-[10px] text-[var(--paper-faint)] border-t border-[var(--ink-border)] pt-2.5">
          <span>REAL-TIME DISPATCH INDEX</span>
          <span>EST. 2026</span>
        </div>
      </div>
    </div>
  );
}
