'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Flame,
  Clock,
  Calendar,
  Users,
  Eye,
  CheckCircle2,
  TrendingUp,
  Sparkles,
  Shield,
  Radio,
} from 'lucide-react';
import { useAuth, useToast } from '@/components/providers';
import { CreatorReportCard } from '@/lib/types';
import Link from 'next/link';

export default function CreatorReportCardPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [report, setReport] = useState<CreatorReportCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState('dagmawi_babi');

  useEffect(() => {
    setLoading(true);
    fetch(`/api/creator/report-card?channel=${selectedChannel}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.reportCard) setReport(data.reportCard);
      })
      .catch((err) => console.warn('[CreatorReportCard] fetch error:', err))
      .finally(() => setLoading(false));
  }, [selectedChannel]);

  return (
    <div className="w-full max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-8 flex flex-col gap-6 sm:gap-8 font-teletype">
      {/* Masthead Header */}
      <div className="p-4 sm:p-8 bg-[var(--card-bg)] border-2 border-[var(--ink-border-heavy)] shadow-[4px_4px_0px_0px_var(--shadow-color)] sm:shadow-[6px_6px_0px_0px_var(--shadow-color)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex flex-col gap-2 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 stamp-badge-gold stamp-badge text-[10px] sm:text-xs self-start">
            <BarChart3 className="w-3.5 h-3.5" />
            <span>CREATOR INTELLIGENCE · SOVEREIGN REPORT CARD</span>
          </div>
          <h1 className="font-broadsheet font-black text-2xl sm:text-4xl text-[var(--paper-cream)] tracking-tight uppercase">
            Creator Pulse & Report Card
          </h1>
          <p className="text-xs sm:text-sm text-[var(--paper-muted)] leading-relaxed font-sans">
            Flip the roast lens around. Track transmission velocity, reader engagement heatmaps, peak broadcasting hours, and editorial consistency scores.
          </p>
        </div>

        {/* Channel Switcher */}
        <div className="flex flex-col gap-1.5 shrink-0 self-stretch sm:self-auto">
          <span className="text-[10px] text-[var(--paper-muted)] font-bold uppercase">SELECT CHANNEL:</span>
          <select
            value={selectedChannel}
            onChange={(e) => setSelectedChannel(e.target.value)}
            className="p-2 bg-[var(--subtle-bg)] border border-[var(--ink-border)] text-[var(--paper-cream)] focus:border-[#d97706] outline-none text-xs font-teletype font-bold uppercase"
          >
            <option value="dagmawi_babi">@dagmawi_babi</option>
            <option value="tikvahethiopia">@tikvahethiopia</option>
            <option value="onyx_community">@onyx_community</option>
          </select>
        </div>
      </div>

      {loading || !report ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="broadsheet-card p-6 h-32 animate-pulse bg-zinc-900/50" />
          ))}
        </div>
      ) : (
        <>
          {/* Key Metric Tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="broadsheet-card p-4 flex flex-col justify-between gap-2 shadow-[2px_2px_0px_0px_var(--shadow-color)]">
              <span className="text-[10px] text-[var(--paper-muted)] uppercase">TOTAL DISPATCHES</span>
              <span className="font-broadsheet font-black text-2xl text-[var(--paper-cream)]">
                {report.totalPosts}
              </span>
              <span className="text-[9px] text-emerald-400 font-mono">+18% this month</span>
            </div>

            <div className="broadsheet-card p-4 flex flex-col justify-between gap-2 shadow-[2px_2px_0px_0px_var(--shadow-color)]">
              <span className="text-[10px] text-[var(--paper-muted)] uppercase">TOTAL VIEWS</span>
              <span className="font-broadsheet font-black text-2xl text-[var(--paper-cream)]">
                {(report.totalViews / 1000).toFixed(1)}k
              </span>
              <span className="text-[9px] text-[#d97706] font-mono">~{report.avgViewsPerPost} / post</span>
            </div>

            <div className="broadsheet-card p-4 flex flex-col justify-between gap-2 shadow-[2px_2px_0px_0px_var(--shadow-color)]">
              <span className="text-[10px] text-[var(--paper-muted)] uppercase">PEAK BROADCAST HOUR</span>
              <span className="font-broadsheet font-black text-lg sm:text-xl text-[var(--paper-cream)] truncate">
                {String(report.topPostingHour).split(' ')[0]}
              </span>
              <span className="text-[9px] text-indigo-400 font-mono">Prime reader activity</span>
            </div>

            <div className="broadsheet-card p-4 flex flex-col justify-between gap-2 shadow-[2px_2px_0px_0px_var(--shadow-color)]">
              <span className="text-[10px] text-[var(--paper-muted)] uppercase">CONSISTENCY SCORE</span>
              <span className="font-broadsheet font-black text-2xl text-emerald-400">
                {report.consistencyScore}%
              </span>
              <span className="text-[9px] text-emerald-400 font-mono">Sovereign Tier</span>
            </div>
          </div>

          {/* Editorial Analysis & Topic Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Editorial Roast Summary */}
            <div className="broadsheet-card p-5 sm:p-7 flex flex-col justify-between gap-4 shadow-[4px_4px_0px_0px_var(--shadow-color)]">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 border-b border-[var(--ink-border)] pb-2.5">
                  <Flame className="w-4 h-4 text-[#d97706]" />
                  <h3 className="font-bold text-xs sm:text-sm text-[var(--paper-cream)] uppercase">
                    Editorial Court Assessment
                  </h3>
                </div>
                <p className="text-xs text-[var(--paper-cream)] font-sans leading-relaxed pt-1">
                  {report.roastSummary}
                </p>
              </div>

              <div className="p-3 bg-[var(--subtle-bg)] border border-[var(--ink-border)] flex items-center justify-between text-xs">
                <span className="text-[var(--paper-muted)]">ACTIVE PEAK DAY:</span>
                <span className="font-bold text-[#d97706] font-mono">{report.mostActiveDay}</span>
              </div>
            </div>

            {/* Topic Distribution */}
            <div className="broadsheet-card p-5 sm:p-7 flex flex-col gap-4 shadow-[4px_4px_0px_0px_var(--shadow-color)]">
              <div className="flex items-center gap-2 border-b border-[var(--ink-border)] pb-2.5">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-xs sm:text-sm text-[var(--paper-cream)] uppercase">
                  Top Topics That Resonated
                </h3>
              </div>

              <div className="flex flex-col gap-3 font-sans text-xs">
                {report.topTopics.map((t, idx) => (
                  <div key={idx} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-xs font-teletype">
                      <span className="text-[var(--paper-cream)]">{t.topic}</span>
                      <span className="font-mono font-bold text-[#d97706]">{t.percentage}%</span>
                    </div>
                    <div className="w-full bg-[var(--subtle-bg)] h-2 border border-[var(--ink-border)]">
                      <div
                        className="bg-[#d97706] h-full"
                        style={{ width: `${t.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
