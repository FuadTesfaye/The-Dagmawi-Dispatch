'use client';

import React, { useState, useEffect } from 'react';
import { Post, AIReview } from '@/lib/types';
import { useToast } from './providers';
import { Sparkles, Flame, CheckCircle, Lightbulb, X, Loader2, Bot, Copy, Check } from 'lucide-react';

interface AIReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: Post;
}

type AIKind = 'summary' | 'roast' | 'fact_check' | 'eli5';

const MODES = [
  { id: 'summary' as AIKind, label: 'Summary', icon: CheckCircle },
  { id: 'roast' as AIKind, label: 'Roast', icon: Flame },
  { id: 'fact_check' as AIKind, label: 'Fact Check', icon: Sparkles },
  { id: 'eli5' as AIKind, label: 'ELI5', icon: Lightbulb },
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
        showToast(err.error || 'Failed to generate review', 'error');
      }
    } catch {
      showToast('Network error contacting AI pool', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    const text = reviews[selectedKind];
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    showToast('Copied to clipboard', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-[#11141d] rounded-xl border border-white/[0.08] p-5 sm:p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-zinc-100">AI Editorial Synthesis</h3>
              <p className="text-[11px] text-zinc-500">Dispatch #{post.id} · @{post.channel}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-4 gap-1.5 p-1 rounded-lg bg-zinc-900 border border-zinc-800/80">
          {MODES.map(({ id, label, icon: Icon }) => {
            const isSelected = selectedKind === id;
            return (
              <button
                key={id}
                onClick={() => handleGenerate(id)}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-medium transition-colors ${
                  isSelected
                    ? 'bg-zinc-800 text-white font-semibold shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        {/* AI Output Area */}
        <div className="p-4 rounded-lg bg-zinc-900/70 border border-white/[0.04] min-h-[140px] flex flex-col justify-center">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-2 text-zinc-400 py-6">
              <Loader2 className="w-5 h-5 animate-spin text-zinc-300" />
              <span className="text-xs font-medium">Generating synthesis...</span>
            </div>
          ) : reviews[selectedKind] ? (
            <div className="flex flex-col gap-3">
              <div className="text-xs sm:text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap font-normal">
                {reviews[selectedKind]}
              </div>

              <div className="flex justify-end pt-2 hairline-t">
                <button
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 py-4 text-center">
              <p className="text-xs text-zinc-400">
                Click to synthesize this dispatch using Groq LLM.
              </p>
              <button
                onClick={() => handleGenerate(selectedKind)}
                className="px-4 py-1.5 rounded-md text-xs font-semibold bg-zinc-100 hover:bg-white text-zinc-950 transition-colors"
              >
                Generate Synthesis
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1">
          <span>Groq Llama 3.3 Versatile</span>
          <button
            onClick={() => handleGenerate(selectedKind)}
            className="text-zinc-400 hover:text-zinc-200 font-medium"
          >
            Regenerate ↻
          </button>
        </div>
      </div>
    </div>
  );
}
