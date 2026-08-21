'use client';

import React, { useState, useEffect } from 'react';
import {
  Compass,
  ThumbsUp,
  Plus,
  Sparkles,
  CheckCircle2,
  Clock,
  Hammer,
  Lightbulb,
  X,
  Loader2,
  Filter,
} from 'lucide-react';
import { useAuth, useToast } from '@/components/providers';
import { FeatureRequest } from '@/lib/types';

export default function PublicRoadmapPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [features, setFeatures] = useState<FeatureRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'shipped' | 'in_progress' | 'planned' | 'open'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState<'utility' | 'fun' | 'creator' | 'general'>('utility');
  const [submitting, setSubmitting] = useState(false);

  const fetchRoadmap = () => {
    fetch('/api/roadmap')
      .then((res) => res.json())
      .then((data) => {
        if (data.features) setFeatures(data.features);
      })
      .catch((err) => console.warn('[Roadmap] fetch error:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRoadmap();
  }, []);

  const handleUpvote = async (featureId: string) => {
    if (!user) {
      showToast('Please sign in to upvote roadmap features', 'info');
      return;
    }

    try {
      const res = await fetch('/api/roadmap/upvote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featureId }),
      });

      if (res.ok) {
        const data = await res.json();
        setFeatures((prev) =>
          prev.map((f) =>
            f.id === featureId
              ? { ...f, upvoteCount: data.upvoteCount, hasUpvoted: data.hasUpvoted }
              : f
          )
        );
        showToast(data.hasUpvoted ? 'Upvote recorded!' : 'Upvote removed', 'success');
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to upvote', 'error');
      }
    } catch {
      showToast('Network error upvoting feature', 'error');
    }
  };

  const handleCreateFeature = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDescription.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/roadmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDescription.trim(),
          category: newCategory,
        }),
      });

      if (res.ok) {
        showToast('Feature proposal submitted to the Royal Board!', 'success');
        setNewTitle('');
        setNewDescription('');
        setIsModalOpen(false);
        fetchRoadmap();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to submit proposal', 'error');
      }
    } catch {
      showToast('Network error submitting proposal', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredFeatures = features.filter((f) => {
    if (activeTab === 'all') return true;
    return f.status === activeTab;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'shipped':
        return (
          <span className="stamp-badge border-emerald-500/50 bg-emerald-950/30 text-emerald-300 flex items-center gap-1 text-[9px]">
            <CheckCircle2 className="w-3 h-3" /> SHIPPED
          </span>
        );
      case 'in_progress':
        return (
          <span className="stamp-badge border-[#d97706]/50 bg-[#241c10] text-[#f6d89b] flex items-center gap-1 text-[9px]">
            <Hammer className="w-3 h-3 text-[#d97706]" /> IN PROGRESS
          </span>
        );
      case 'planned':
        return (
          <span className="stamp-badge border-blue-500/50 bg-blue-950/30 text-blue-300 flex items-center gap-1 text-[9px]">
            <Clock className="w-3 h-3" /> PLANNED
          </span>
        );
      default:
        return (
          <span className="stamp-badge text-[var(--paper-muted)] flex items-center gap-1 text-[9px]">
            <Lightbulb className="w-3 h-3" /> COMMUNITY IDEA
          </span>
        );
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-8 flex flex-col gap-6 font-teletype">
      {/* Masthead Header */}
      <div className="p-4 sm:p-8 bg-[var(--card-bg)] border-2 border-[var(--ink-border-heavy)] shadow-[4px_4px_0px_0px_var(--shadow-color)] sm:shadow-[6px_6px_0px_0px_var(--shadow-color)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex flex-col gap-2 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 stamp-badge-gold stamp-badge text-[10px] sm:text-xs self-start">
            <Compass className="w-3.5 h-3.5" />
            <span>COMMUNITY GOVERNANCE · PUBLIC REGISTRY</span>
          </div>
          <h1 className="font-broadsheet font-black text-2xl sm:text-4xl text-[var(--paper-cream)] tracking-tight uppercase">
            The Sovereign Roadmap
          </h1>
          <p className="text-xs sm:text-sm text-[var(--paper-muted)] leading-relaxed font-sans">
            Shape the future of The Lurkening. Vote on planned features, review shipped intelligence modules, and submit new decrees directly to the court.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="stamp-btn !bg-[#d97706] !text-black !border-[#d97706] hover:!bg-[var(--paper-cream)] !py-3 !px-4 text-xs font-bold active:scale-95 shadow-[3px_3px_0px_0px_var(--shadow-color)] flex items-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>PROPOSE DECREE</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
        {[
          { id: 'all', label: 'ALL PROPOSALS' },
          { id: 'shipped', label: 'SHIPPED' },
          { id: 'in_progress', label: 'IN PROGRESS' },
          { id: 'planned', label: 'PLANNED' },
          { id: 'open', label: 'COMMUNITY IDEAS' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3 py-1.5 border transition-all uppercase font-bold text-[11px] active:scale-95 min-w-max ${
              activeTab === tab.id
                ? 'bg-[var(--paper-cream)] text-[var(--ink-bg)] border-[var(--paper-cream)] shadow-[2px_2px_0px_0px_var(--shadow-color)]'
                : 'bg-[var(--subtle-bg)] text-[var(--paper-muted)] border-[var(--ink-border)] hover:border-[var(--paper-cream)] hover:text-[var(--paper-cream)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Feature Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="broadsheet-card p-5 h-36 animate-pulse bg-zinc-900/50" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredFeatures.map((f) => (
            <div
              key={f.id}
              className="broadsheet-card p-4 sm:p-5 flex flex-col justify-between gap-3 shadow-[3px_3px_0px_0px_var(--shadow-color)] transition-transform hover:-translate-y-0.5"
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  {getStatusBadge(f.status)}
                  <span className="text-[10px] text-[var(--paper-muted)] uppercase font-mono">
                    Category: {f.category}
                  </span>
                </div>

                <h3 className="font-broadsheet font-bold text-base text-[var(--paper-cream)] uppercase">
                  {f.title}
                </h3>
                <p className="text-xs text-[var(--paper-muted)] font-sans leading-relaxed">
                  {f.description}
                </p>
              </div>

              <div className="flex items-center justify-between border-t border-[var(--ink-border)] pt-2.5 mt-1">
                <span className="text-[10px] text-[var(--paper-faint)] truncate max-w-[150px]">
                  Proposed by: {f.creatorName}
                </span>

                <button
                  onClick={() => handleUpvote(f.id)}
                  className={`stamp-btn !py-1 !px-2.5 text-xs flex items-center gap-1.5 active:scale-95 ${
                    f.hasUpvoted
                      ? '!bg-[#d97706] !text-black !border-[#d97706]'
                      : 'hover:border-[#d97706]'
                  }`}
                  title="Upvote feature proposal"
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span className="font-mono font-bold">{f.upvoteCount}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Propose Feature Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in-50">
          <div className="broadsheet-card p-5 sm:p-7 max-w-lg w-full border-2 border-[var(--ink-border-heavy)] shadow-2xl flex flex-col gap-4 font-teletype">
            <div className="flex items-center justify-between border-b border-[var(--ink-border)] pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 border border-[#d97706] bg-[#241c10] text-[#d97706] flex items-center justify-center font-bold text-xs">
                  §
                </div>
                <h3 className="font-broadsheet font-black text-base sm:text-lg text-[var(--paper-cream)] uppercase">
                  Propose New Feature Decree
                </h3>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 border border-[var(--ink-border)] text-[var(--paper-muted)] hover:text-[var(--paper-cream)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateFeature} className="flex flex-col gap-3 font-sans text-xs">
              <div className="flex flex-col gap-1">
                <label className="font-teletype font-bold text-[10px] text-[var(--paper-cream)] uppercase">
                  Feature Title:
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Audio Teleprinter Voice Notes"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="p-2 bg-[var(--input-bg)] border border-[var(--ink-border)] text-[var(--paper-cream)] focus:border-[#d97706] outline-none font-teletype text-xs"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-teletype font-bold text-[10px] text-[var(--paper-cream)] uppercase">
                  Category:
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  className="p-2 bg-[var(--input-bg)] border border-[var(--ink-border)] text-[var(--paper-cream)] focus:border-[#d97706] outline-none font-teletype text-xs"
                >
                  <option value="utility">Utility (Retention Floor)</option>
                  <option value="fun">Fun & Creative (Roasts / Battles)</option>
                  <option value="creator">Creator Tools & Analytics</option>
                  <option value="general">General Enhancement</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-teletype font-bold text-[10px] text-[var(--paper-cream)] uppercase">
                  Description & Value:
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe how this feature solves a real problem or delights the community..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="p-2 bg-[var(--input-bg)] border border-[var(--ink-border)] text-[var(--paper-cream)] focus:border-[#d97706] outline-none text-xs"
                />
              </div>

              <div className="mt-2 flex items-center justify-end gap-2 font-teletype">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="stamp-btn !py-2 !px-3 text-xs"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="stamp-btn !bg-[#d97706] !text-black !border-[#d97706] hover:!bg-[var(--paper-cream)] !py-2 !px-4 text-xs font-bold flex items-center gap-1.5"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>SUBMIT PROPOSAL</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
