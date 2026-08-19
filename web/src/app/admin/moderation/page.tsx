'use client';

import React, { useState, useEffect } from 'react';
import { useAuth, useToast } from '@/components/providers';
import { ModerationReport } from '@/lib/types';
import { Shield, Check, X, Flag, AlertTriangle, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function AdminModerationPage() {
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || (user.role !== 'admin' && user.role !== 'moderator')) return;
    setLoading(true);

    fetch('/api/admin/reports')
      .then((res) => res.json())
      .then((data) => {
        if (data.reports) {
          setReports(data.reports);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const handleUpdateStatus = async (reportId: string, status: 'reviewed' | 'dismissed') => {
    try {
      const res = await fetch('/api/admin/reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, status }),
      });

      if (res.ok) {
        setReports((prev) =>
          prev.map((r) => (r.id === reportId ? { ...r, status } : r))
        );
        showToast(`Report marked as ${status}`, 'success');
      } else {
        showToast('Failed to update report status', 'error');
      }
    } catch {
      showToast('Error updating report', 'error');
    }
  };

  if (authLoading) {
    return (
      <div className="flex justify-center items-center py-20 text-amber-400">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!user || (user.role !== 'admin' && user.role !== 'moderator')) {
    return (
      <div className="max-w-md mx-auto py-12 text-center glass-panel rounded-3xl p-8 flex flex-col items-center gap-4 border border-rose-500/30">
        <AlertTriangle className="w-12 h-12 text-rose-400" />
        <h2 className="text-xl font-extrabold text-zinc-100">Court Access Denied</h2>
        <p className="text-xs text-zinc-400">
          Only royal court admins and moderators can inspect community reports.
        </p>
        <Link
          href="/"
          className="px-4 py-2 rounded-full bg-amber-500 text-zinc-950 font-bold text-xs shadow-md shadow-amber-500/20"
        >
          Return to Feed
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
          <Shield className="w-4 h-4" />
          <span>Royal Court Moderation</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-zinc-100">
          Community Reports ({reports.length})
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Inspect flagged posts and user comments to maintain civility across the kingdom.
        </p>
      </div>

      {/* Reports List */}
      {loading ? (
        <div className="flex justify-center py-16 text-amber-400">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : reports.length === 0 ? (
        <div className="glass-panel rounded-3xl p-12 text-center text-zinc-400 text-xs flex flex-col items-center gap-2">
          <span>🛡️</span>
          <p>No community reports pending. The court is peaceful!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {reports.map((r) => (
            <div
              key={r.id}
              className={`p-5 rounded-3xl glass-panel border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all ${
                r.status === 'pending'
                  ? 'border-amber-500/30 bg-amber-500/5'
                  : r.status === 'reviewed'
                  ? 'border-emerald-500/30 bg-emerald-500/5'
                  : 'border-zinc-800 opacity-60'
              }`}
            >
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold uppercase text-amber-400">
                    [{r.targetType.toUpperCase()}]
                  </span>
                  <span className="text-xs text-zinc-300">
                    Channel: <strong>@{r.channel}</strong>
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      r.status === 'pending'
                        ? 'bg-amber-500/20 text-amber-300'
                        : r.status === 'reviewed'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {r.status}
                  </span>
                </div>

                <p className="text-sm font-semibold text-zinc-100">Reason: {r.reason}</p>
                {r.details && <p className="text-xs text-zinc-400">Details: {r.details}</p>}

                <span className="text-[11px] text-zinc-500">
                  Reported by {r.user?.displayName || 'Anonymous'} · {r.createdAt}
                </span>
              </div>

              {/* Status Action Buttons */}
              {r.status === 'pending' && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleUpdateStatus(r.id, 'reviewed')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition-all"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Resolve</span>
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(r.id, 'dismissed')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs font-semibold transition-all"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Dismiss</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
