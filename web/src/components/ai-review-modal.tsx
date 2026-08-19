'use client';

import React, { useState, useEffect } from 'react';
import { Post, AIReview } from '@/lib/types';
import { useToast } from './providers';
import { X, Loader2, Bot, Copy, Check } from 'lucide-react';

interface AIReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: Post;
}

type AIKind = 'summary' | 'roast' | 'fact_check' | 'eli5';

const MODES = [
  { id: 'summary' as AIKind, label: '[01 SUMMARY]', desc: 'Executive Brief' },
  { id: 'roast' as AIKind, label: '[02 ROAST]', desc: 'Royal Sarcasm' },
  { id: 'fact_check' as AIKind, label: '[03 FACT CHECK]', desc: 'Investigation' },
  { id: 'eli5' as AIKind, label: '[04 ELI5]', desc: 'Plain Language' },
];

export function AIReviewModal({ isOpen, onClose, post }: AIReviewModalProps) {
  const { showToast } = useToast();
  const [selectedKind, setSelectedKind] = useState<AIKind>('summary');
  const [reviews, setReviews] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    fetch(`/api/posts/${post.id}/ai-review?channel=${post.channel}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.reviews) {
          const map: Record<string, string> = {};
          for (const r of data.reviews as AIReview[]) {
            map[r.kind] = r.content;
          }
          setReviews(map);
        }
      })
      .catch(() => {});
  }, [isOpen, post.id, post.channel]);

  const handleGenerate = async (kind: AIKind) => {
    setSelectedKind(kind);
    if (reviews[kind]) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/posts/${post.id}/ai-review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, channel: post.channel }),
      });

      if (res.ok) {
        const data = await res.json();
        setReviews((prev) => ({ ...prev, [kind]: data.review.content }));
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to generate synthesis', 'error');
      }
    } catch {
      showToast('Network error querying AI engine', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    const text = reviews[selectedKind];
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    showToast('Synthesis text copied', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm font-teletype">
      <div className="relative w-full max-w-xl bg-[#12141c] border-2 border-[#3d4257] p-6 shadow-[8px_8px_0px_0px_#000000] flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
        {/* Masthead Header */}
        <div className="flex items-center justify-between border-b-2 border-[#262936] pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-[#d97706]" />
            <div>
              <h3 className="font-bold text-sm text-[#f4f0e6] uppercase">
                Royal Scribe Synthesis
              </h3>
              <p className="text-[10px] text-[#a39e93]">
                DISPATCH #{post.id} · TELEGRAM CHANNEL @{post.channel}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 border border-[#262936] text-[#a39e93] hover:text-[#f4f0e6] hover:bg-[#171a24] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Selector Stamps */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {MODES.map(({ id, label, desc }) => {
            const isSelected = selectedKind === id;
            return (
              <button
                key={id}
                onClick={() => handleGenerate(id)}
                className={`flex flex-col items-center justify-center py-2 px-2 border text-xs font-bold uppercase transition-all ${
                  isSelected
                    ? 'bg-[#d97706] text-black border-[#d97706] shadow-[2px_2px_0px_0px_#000000]'
                    : 'bg-[#171a24] text-[#a39e93] border-[#262936] hover:text-[#f4f0e6] hover:border-[#f4f0e6]'
                }`}
              >
                <span>{label}</span>
                <span className="text-[9px] opacity-75 font-normal">{desc}</span>
              </button>
            );
          })}
        </div>

        {/* Synthesis Output Area */}
        <div className="p-4 bg-[#0c0d10] border border-[#262936] min-h-[160px] flex flex-col justify-center">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-2 text-[#a39e93] py-6">
              <Loader2 className="w-5 h-5 animate-spin text-[#d97706]" />
              <span className="text-xs">[ CONSULTING GROQ LLM POOL... ]</span>
            </div>
          ) : reviews[selectedKind] ? (
            <div className="flex flex-col gap-3">
              <div className="text-xs sm:text-sm text-[#f4f0e6] font-sans leading-relaxed whitespace-pre-wrap">
                {reviews[selectedKind]}
              </div>

              <div className="flex justify-end pt-2 border-t border-[#262936]">
                <button
                  onClick={handleCopy}
                  className="stamp-btn !py-1 !px-2.5 flex items-center gap-1.5 !text-[10px]"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'COPIED' : 'COPY RECORD'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 py-4 text-center">
              <p className="text-xs text-[#a39e93]">
                Click above to synthesize this post with Groq AI.
              </p>
              <button
                onClick={() => handleGenerate(selectedKind)}
                className="stamp-btn"
              >
                GENERATE {MODES.find((m) => m.id === selectedKind)?.label}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-[10px] text-[#a39e93] pt-1">
          <span>MODEL: GROQ LLAMA-3.3-70B-VERSATILE</span>
          <button
            onClick={() => handleGenerate(selectedKind)}
            className="text-[#d97706] hover:underline"
          >
            REGENERATE ↻
          </button>
        </div>
      </div>
    </div>
  );
}
