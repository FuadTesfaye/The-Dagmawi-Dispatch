export function Stat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div className="broadsheet-card px-4 py-3 font-teletype">
      <div className="text-[10px] text-[#a39e93] uppercase font-bold tracking-wider">{label}</div>
      <div
        className={`mt-1 text-base sm:text-lg font-bold ${
          accent ? "text-[#d97706]" : "text-[#f4f0e6]"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
