'use client';

import React, { useState, useEffect } from 'react';
import { useAuth, useToast } from '@/components/providers';
import { ModerationReport } from '@/lib/types';
import { Shield, Check, X, AlertTriangle, Loader2 } from 'lucide-react';
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
        showToast(`Inquest report marked as ${status.toUpperCase()}`, 'success');
      } else {
        showToast('Failed to update report status', 'error');
      }
    } catch {
      showToast('Error updating report', 'error');
    }
  };

  if (authLoading) {
    return (
      <div className="flex justify-center items-center py-20 text-[#a39e93] font-teletype">
        <Loader2 className="w-6 h-6 animate-spin text-[#d97706]" />
      </div>
    );
  }

  if (!user || (user.role !== 'admin' && user.role !== 'moderator')) {
    return (
      <div className="max-w-md mx-auto py-12 px-3 text-center broadsheet-card p-6 sm:p-8 flex flex-col items-center gap-4 font-teletype">
        <AlertTriangle className="w-10 h-10 text-rose-500" />
        <h2 className="text-sm font-bold text-[#f4f0e6] uppercase">[ COURT INQUEST ACCESS DENIED ]</h2>
        <p className="text-xs text-[#a39e93] font-sans">
          Only authenticated royal court scribes may inspect community inquest citations.
        </p>
        <Link
          href="/"
          className="stamp-btn"
        >
          RETURN TO BROADSHEET FEED
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-8 font-teletype">
      {/* Header */}
      <div className="border-b-2 border-[#262936] pb-4">
        <div className="flex items-center gap-2 text-[#d97706] text-[10px] font-bold uppercase tracking-widest mb-1">
          <Shield className="w-3.5 h-3.5" />
          <span>§ SECTION IV: COURT INQUEST REGISTRY</span>
        </div>
        <h1 className="font-broadsheet font-black text-2xl sm:text-4xl text-[#f4f0e6] uppercase">
          Inquest Citations ({reports.length})
        </h1>
        <p className="text-xs text-[#a39e93] mt-1 font-sans">
          Review citations and maintain decorum across the telegraphic broadcast network.
        </p>
      </div>

      {/* Reports List */}
      {loading ? (
        <div className="flex justify-center py-16 text-[#a39e93]">
          <Loader2 className="w-6 h-6 animate-spin text-[#d97706]" />
        </div>
      ) : reports.length === 0 ? (
        <div className="broadsheet-card p-10 sm:p-12 text-center text-[#a39e93] text-xs flex flex-col items-center gap-2">
          <p>[ NO PENDING COURT CITATIONS. THE REALM IS AT PEACE. ]</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {reports.map((r) => (
            <div
              key={r.id}
              className={`p-4 sm:p-5 broadsheet-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all ${
                r.status === 'pending'
                  ? 'border-[#785a28] bg-[#1a1710]'
                  : r.status === 'reviewed'
                  ? 'border-emerald-900 bg-emerald-950/20'
                  : 'opacity-60'
              }`}
            >
              <div className="flex flex-col gap-1.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-[#d97706] uppercase">
                    [{r.targetType.toUpperCase()}]
                  </span>
                  <span className="text-xs text-[#f4f0e6]">
                    CHANNEL: <strong>@{r.channel}</strong>
                  </span>
                  <span
                    className={`stamp-badge text-[9px] !py-0 !px-1.5 ${
                      r.status === 'pending'
                        ? 'stamp-badge-gold'
                        : r.status === 'reviewed'
                        ? '!border-emerald-700 !bg-emerald-950 !text-emerald-300'
                        : ''
                    }`}
                  >
                    STATUS: {r.status.toUpperCase()}
                  </span>
                </div>

                <p className="text-xs font-bold text-[#f4f0e6] uppercase">REASON: {r.reason}</p>
                {r.details && (
                  <p className="text-xs text-[#a39e93] font-sans break-words">DETAILS: {r.details}</p>
                )}

                <span className="text-[10px] text-[#a39e93]">
                  FILED BY {r.user?.displayName?.toUpperCase() || 'ANONYMOUS SCRIBE'} · {r.createdAt}
                </span>
              </div>

              {/* Status Action Buttons */}
              {r.status === 'pending' && (
                <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#262936] w-full sm:w-auto">
                  <button
                    onClick={() => handleUpdateStatus(r.id, 'reviewed')}
                    className="stamp-btn !bg-emerald-950 !border-emerald-700 !text-emerald-300 hover:!bg-emerald-600 hover:!text-black flex items-center gap-1 !text-[10px] flex-1 sm:flex-initial active:scale-95"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>RESOLVE</span>
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(r.id, 'dismissed')}
                    className="stamp-btn !bg-[#12141c] !text-[#a39e93] hover:!text-[#f4f0e6] flex items-center gap-1 !text-[10px] flex-1 sm:flex-initial active:scale-95"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>DISMISS</span>
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
