import Link from "next/link";
import { Radio, ArrowUpRight, BookOpen, Search, Shield, Bot } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0c0d10] text-[#f4f0e6] font-teletype selection:bg-[#d97706] selection:text-black">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-20 flex flex-col gap-12">
        {/* Frontpage Broadsheet Masthead */}
        <div className="p-6 sm:p-12 bg-[#12141c] border-2 border-[#262936] shadow-[8px_8px_0px_0px_#000000] flex flex-col gap-6 text-center items-center">
          {/* Scribe Stamp */}
          <div className="inline-flex items-center gap-2 stamp-badge-gold stamp-badge">
            <span>§ BY ROYAL DECREE</span>
            <span>·</span>
            <span>ISSUE NO. 88</span>
          </div>

          {/* Masthead Title */}
          <div className="flex flex-col gap-2">
            <h1 className="font-broadsheet font-black text-4xl sm:text-7xl text-[#f4f0e6] tracking-tight uppercase">
              The Dagmawi Dispatch
            </h1>
            <p className="font-teletype text-xs sm:text-base text-[#d6d0c2] max-w-2xl mx-auto leading-relaxed uppercase">
              High-frequency Telegram broadcast archive, Groq AI editorial synthesis, and community inquest court.
            </p>
          </div>

          <p className="italic font-sans text-xs sm:text-sm text-[#a39e93] max-w-lg">
            &ldquo;Because you have a kingdom to run, and the scribes have a teleprinter to break.&rdquo;
          </p>

          {/* Action Stamps */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-[#262936] w-full">
            <a
              href="https://t.me/BabisummarizeBot"
              target="_blank"
              rel="noopener noreferrer"
              className="stamp-btn flex items-center gap-2 !py-3 !px-6 text-xs"
            >
              <Bot className="w-4 h-4 text-[#d97706]" />
              <span>SUMMON @BabisummarizeBot</span>
            </a>

            <Link
              href="/explorer"
              className="stamp-btn !bg-[#12141c] !text-[#a39e93] hover:!text-[#f4f0e6] flex items-center gap-2 !py-3 !px-6 text-xs"
            >
              <Search className="w-4 h-4 text-[#d97706]" />
              <span>SEARCH ENGINE & GRAPH</span>
            </Link>
          </div>
        </div>

        {/* Feature Columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="broadsheet-card p-6 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-[#262936] pb-2">
              <span className="text-xs font-bold text-[#d97706] uppercase">[ 01 CHRONOMETER ]</span>
              <span className="text-[10px] text-[#a39e93]">TELETYPE</span>
            </div>
            <h3 className="font-broadsheet font-bold text-lg text-[#f4f0e6] uppercase">The Babi-O-Meter</h3>
            <p className="font-sans text-xs text-[#a39e93] leading-relaxed">
              Real-time velocity gauge showing today's posting volume. 1 trumpet? A quiet baseline. 5 trumpets? Sound the alarms.
            </p>
          </div>

          <div className="broadsheet-card p-6 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-[#262936] pb-2">
              <span className="text-xs font-bold text-[#d97706] uppercase">[ 02 SYNTHESIS ]</span>
              <span className="text-[10px] text-[#a39e93]">GROQ AI</span>
            </div>
            <h3 className="font-broadsheet font-bold text-lg text-[#f4f0e6] uppercase">Royal AI Roasts</h3>
            <p className="font-sans text-xs text-[#a39e93] leading-relaxed">
              Multi-model Groq Llama-3.3 engine delivers executive summaries, satire roasts, context checks, and ELI5 breakdowns.
            </p>
          </div>

          <div className="broadsheet-card p-6 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-[#262936] pb-2">
              <span className="text-xs font-bold text-[#d97706] uppercase">[ 03 EXPLORER ]</span>
              <span className="text-[10px] text-[#a39e93]">DATABASE</span>
            </div>
            <h3 className="font-broadsheet font-bold text-lg text-[#f4f0e6] uppercase">Full-Text Registry</h3>
            <p className="font-sans text-xs text-[#a39e93] leading-relaxed">
              Search historical archives across all monitored Telegram channels with interactive network graphs and category indexes.
            </p>
          </div>
        </div>

        {/* Footer Notice */}
        <div className="text-center font-teletype text-[10px] text-[#a39e93] border-t border-[#262936] pt-6 uppercase flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>THE DAGMAWI DISPATCH · ROYAL TELEGRAM CHRONICLE</span>
          <span>AUTONOMOUS INGESTION ENGINE ACTIVE</span>
        </div>
      </main>
    </div>
  );
}
