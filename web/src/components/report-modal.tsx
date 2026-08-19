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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm font-teletype">
      <div className="relative w-full max-w-md bg-[#12141c] border-2 border-[#3d4257] p-6 shadow-[8px_8px_0px_0px_#000000] flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-[#262936] pb-3">
          <div className="flex items-center gap-2 text-[#d97706]">
            <Flag className="w-4 h-4" />
            <h3 className="font-bold text-xs text-[#f4f0e6] uppercase">
              File Court Inquest [{targetType.toUpperCase()}]
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 border border-[#262936] text-[#a39e93] hover:text-[#f4f0e6] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-[11px] text-[#a39e93] leading-relaxed">
          Cite this dispatch to the royal court moderators for review against realm guidelines.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Reason Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-[#f4f0e6] uppercase">Citation Reason</label>
            <select
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value)}
              className="w-full py-2 px-3 bg-[#0c0d10] border border-[#262936] text-xs text-[#f4f0e6] font-teletype uppercase focus:outline-none focus:border-[#f4f0e6]"
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
            <label className="text-[11px] font-bold text-[#f4f0e6] uppercase">
              Specific Citation Details (Optional)
            </label>
            <textarea
              rows={3}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="ENTER SPECIFIC VIOLATION CONTEXT..."
              className="w-full p-2.5 bg-[#0c0d10] border border-[#262936] text-xs text-[#f4f0e6] placeholder-[#6b665c] font-teletype uppercase focus:outline-none focus:border-[#f4f0e6] resize-none"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#262936]">
            <button
              type="button"
              onClick={onClose}
              className="stamp-btn !bg-[#12141c] !text-[#a39e93] hover:!text-[#f4f0e6]"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="stamp-btn !bg-rose-950/80 !border-rose-700 !text-rose-200 hover:!bg-rose-600 hover:!text-white flex items-center gap-1.5"
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
