'use client';

import React, { useState } from 'react';
import { useToast } from './providers';
import { Flag, X, Loader2 } from 'lucide-react';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: 'post' | 'comment';
  channel: string;
  postId?: number;
  commentId?: string;
}

const REPORT_REASONS = [
  'Spam or deceptive advertisement',
  'Hate speech or harassment',
  'Misinformation or fake claims',
  'Explicit or inappropriate content',
  'Copyright or intellectual property violation',
  'Other royal decree violation',
];

export function ReportModal({
  isOpen,
  onClose,
  targetType,
  channel,
  postId,
  commentId,
}: ReportModalProps) {
  const { showToast } = useToast();
  const [selectedReason, setSelectedReason] = useState(REPORT_REASONS[0]);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType,
          channel,
          postId,
          commentId,
          reason: selectedReason,
          details: details.trim() || undefined,
        }),
      });

      if (res.ok) {
        showToast('Inquest citation filed to court record. Thank you.', 'success');
        onClose();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to submit inquest citation', 'error');
      }
    } catch {
      showToast('Error submitting inquest citation', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm font-teletype animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-md bg-[var(--card-bg)] border-2 border-[var(--ink-border-heavy)] p-4 sm:p-6 shadow-[6px_6px_0px_0px_var(--shadow-color)] sm:shadow-[8px_8px_0px_0px_var(--shadow-color)] flex flex-col gap-3.5 sm:gap-4 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-[var(--ink-border)] pb-2.5">
          <div className="flex items-center gap-2 text-[#d97706] min-w-0">
            <Flag className="w-4 h-4 shrink-0" />
            <h3 className="font-bold text-xs sm:text-sm text-[var(--paper-cream)] uppercase truncate">
              File Inquest Citation [{targetType.toUpperCase()}]
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 border border-[var(--ink-border)] text-[var(--paper-muted)] hover:text-[var(--paper-cream)] hover:bg-[var(--subtle-bg)] transition-colors active:scale-95 shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-[11px] text-[var(--paper-muted)] leading-relaxed font-sans">
          Cite this dispatch to the royal court moderators for review against realm decorum guidelines.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:gap-4">
          {/* Reason Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-[var(--paper-cream)] uppercase">Citation Reason</label>
            <select
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value)}
              className="w-full py-2 px-3 bg-[var(--input-bg)] border border-[var(--ink-border)] text-xs text-[var(--paper-cream)] font-teletype uppercase focus:outline-none focus:border-[#d97706]"
            >
              {REPORT_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* Details Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-[var(--paper-cream)] uppercase">
              Violation Details (Optional)
            </label>
            <textarea
              rows={3}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="ENTER SPECIFIC VIOLATION CONTEXT..."
              className="w-full p-2.5 bg-[var(--input-bg)] border border-[var(--ink-border)] text-xs text-[var(--paper-cream)] placeholder-[var(--paper-faint)] font-teletype uppercase focus:outline-none focus:border-[#d97706] resize-none"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--ink-border)]">
            <button
              type="button"
              onClick={onClose}
              className="stamp-btn !bg-[var(--card-bg)] !text-[var(--paper-muted)] hover:!text-[var(--paper-cream)] active:scale-95 text-xs"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="stamp-btn !bg-rose-950/80 !border-rose-700 !text-rose-200 hover:!bg-rose-600 hover:!text-white flex items-center gap-1.5 active:scale-95 text-xs font-bold"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>FILE CITATION</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
