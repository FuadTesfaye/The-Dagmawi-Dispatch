export function EmptyState({
  title,
  hint,
}: {
  title: string;
  hint?: string;
}) {
  return (
    <div className="broadsheet-card flex flex-col items-center justify-center gap-2 py-16 text-center font-teletype">
      <div className="text-xs uppercase font-bold text-[#f4f0e6]">
        <span className="text-[#d97706]">{"//"}</span> [ {title.toUpperCase()} ]
      </div>
      {hint && <p className="max-w-sm text-xs text-[#a39e93] font-sans">{hint}</p>}
    </div>
  );
}
