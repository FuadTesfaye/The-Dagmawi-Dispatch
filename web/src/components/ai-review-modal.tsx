'use client';

import React, { useState, useEffect } from 'react';
import { Post, AIReview } from '@/lib/types';
import { useToast } from './providers';
import { Sparkles, Flame, CheckCircle, Lightbulb, X, Loader2, Bot } from 'lucide-react';

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

  // Load existing reviews on mount
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
    if (reviews[kind]) return; // Already have cached analysis

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
        showToast('AI analysis prepared by the Royal Scribes', 'success');
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-xl glass-panel bg-zinc-950/95 rounded-3xl border border-amber-500/30 p-6 shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-zinc-100">Royal AI Commentary</h3>
              <p className="text-xs text-zinc-400">Post #{post.id} from @{post.channel}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition-colors"
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
                className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl text-xs font-semibold border transition-all ${
                  isSelected
                    ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-lg shadow-amber-500/20 font-bold scale-[1.02]'
                    : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-200'
                }`}
              >
                <Icon className={`w-4 h-4 ${isSelected ? 'text-zinc-950' : 'text-amber-400'}`} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        {/* AI Output Area */}
        <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800/80 min-h-[160px] flex flex-col justify-center">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 text-amber-400 py-6">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-xs font-medium text-zinc-400">Consulting the Groq AI Pool...</span>
            </div>
          ) : reviews[selectedKind] ? (
            <div className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap font-sans">
              {reviews[selectedKind]}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
              <Sparkles className="w-8 h-8 text-amber-500/50" />
              <p className="text-xs text-zinc-400 max-w-xs">
                Click above to have the Royal AI synthesize this dispatch into a {selectedKind} review.
              </p>
              <button
                onClick={() => handleGenerate(selectedKind)}
                className="px-4 py-2 rounded-full text-xs font-bold bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-md shadow-amber-500/20 transition-transform active:scale-95"
              >
                Generate {MODES.find((m) => m.id === selectedKind)?.label}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-2 border-t border-zinc-900">
          <span>Powered by Groq Llama 3.3 70B</span>
          <button
            onClick={() => handleGenerate(selectedKind)}
            className="text-amber-400 hover:text-amber-300 font-semibold"
          >
            Regenerate ↻
          </button>
        </div>
      </div>
    </div>
  );
}
