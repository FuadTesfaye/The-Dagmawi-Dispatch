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
  { id: 'summary' as AIKind, label: 'News Brief', icon: CheckCircle, desc: 'Factual key takeaways' },
  { id: 'roast' as AIKind, label: 'Royal Roast', icon: Flame, desc: 'Witty court jester roast' },
  { id: 'fact_check' as AIKind, label: 'Context Check', icon: Sparkles, desc: 'Background & verification' },
  { id: 'eli5' as AIKind, label: 'Explain Like 5', icon: Lightbulb, desc: 'Plain English breakdown' },
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
        showToast('AI commentary prepared by the Royal Scribes', 'success');
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
    showToast('AI analysis copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/85 backdrop-blur-xl animate-in fade-in">
      <div className="relative w-full max-w-xl glass-card bg-zinc-950/98 rounded-3xl border border-amber-500/35 p-6 sm:p-7 shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/40 shadow-inner">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base text-zinc-100">Royal AI Commentary</h3>
              <p className="text-xs text-zinc-400 font-medium">Dispatch #{post.id} from @{post.channel}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition-colors border border-transparent hover:border-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {MODES.map(({ id, label, icon: Icon }) => {
            const isSelected = selectedKind === id;
            return (
              <button
                key={id}
                onClick={() => handleGenerate(id)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl text-xs font-bold border transition-all duration-200 ${
                  isSelected
                    ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-zinc-950 border-amber-400 shadow-md shadow-amber-500/25 scale-[1.02] font-black'
                    : 'bg-zinc-900/80 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-200'
                }`}
              >
                <Icon className={`w-4 h-4 ${isSelected ? 'text-zinc-950' : 'text-amber-400'}`} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        {/* AI Output Area */}
        <div className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 min-h-[160px] flex flex-col justify-center relative">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 text-amber-400 py-8">
              <Loader2 className="w-7 h-7 animate-spin" />
              <span className="text-xs font-bold text-zinc-400">Consulting Groq Llama 3.3 Pool...</span>
            </div>
          ) : reviews[selectedKind] ? (
            <div className="flex flex-col gap-3">
              <div className="text-sm text-zinc-100 leading-relaxed whitespace-pre-wrap font-sans font-medium">
                {reviews[selectedKind]}
              </div>

              <div className="flex justify-end pt-2 border-t border-zinc-800/80">
                <button
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-400 hover:text-amber-300 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy Review'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
              <Sparkles className="w-8 h-8 text-amber-500/50" />
              <p className="text-xs text-zinc-400 max-w-xs">
                Click above to synthesize this post into a {selectedKind} breakdown.
              </p>
              <button
                onClick={() => handleGenerate(selectedKind)}
                className="px-5 py-2.5 rounded-full text-xs font-black bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-zinc-950 shadow-md shadow-amber-500/20 transition-transform active:scale-95"
              >
                Generate {MODES.find((m) => m.id === selectedKind)?.label}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-500 pt-2 border-t border-zinc-900">
          <span>Powered by Multi-Key Groq Pool</span>
          <button
            onClick={() => handleGenerate(selectedKind)}
            className="text-amber-400 hover:text-amber-300 font-bold"
          >
            Regenerate ↻
          </button>
        </div>
      </div>
    </div>
  );
}
