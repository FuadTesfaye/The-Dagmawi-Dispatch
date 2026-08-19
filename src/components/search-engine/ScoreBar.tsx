import { scoreColor } from "@/lib/search-engine/format";

export function ScoreRing({ score }: { score: number | null }) {
  const s = Math.max(0, Math.min(100, Math.round(score ?? 0)));
  const color = scoreColor(score);
  const stroke =
    s >= 70 ? "#d97706" : s >= 45 ? "#d6d0c2" : "#785a28";
  const circ = 2 * Math.PI * 18;
  const dash = (s / 100) * circ;
  return (
    <div className="relative h-12 w-12 shrink-0 font-teletype">
      <svg viewBox="0 0 44 44" className="h-12 w-12 -rotate-90">
        <circle cx="22" cy="22" r="18" fill="none" stroke="#262936" strokeWidth="3" />
        <circle
          cx="22"
          cy="22"
          r="18"
          fill="none"
          stroke={stroke}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
        />
      </svg>
      <span
        className={`absolute inset-0 flex items-center justify-center font-bold text-xs ${color}`}
      >
        {s}
      </span>
    </div>
  );
}

export function ScoreBar({
  label,
  score,
}: {
  label: string;
  score: number | null;
  }) {
  const s = Math.max(0, Math.min(100, Math.round(score ?? 0)));
  const fill =
    s >= 70 ? "bg-[#d97706]" : s >= 45 ? "bg-[#d6d0c2]" : "bg-[#785a28]";
  return (
    <div className="flex items-center gap-3 font-teletype">
      <span className="text-[10px] text-[#a39e93] uppercase font-bold w-20 shrink-0">{label}</span>
      <div className="h-2 flex-1 overflow-hidden bg-[#0c0d10] border border-[#262936]">
        <div className={`h-full ${fill}`} style={{ width: `${s}%` }} />
      </div>
      <span className="w-8 shrink-0 text-right text-xs text-[#f4f0e6] font-bold">{s}</span>
    </div>
  );
}
