import { categoryLabel } from "@/lib/search-engine/format";

export function CategoryBadge({ category }: { category: string | null }) {
  return (
    <span className="stamp-badge inline-flex items-center text-[10px] uppercase font-bold text-[#d6d0c2] bg-[#171a24] border border-[#262936]">
      [{categoryLabel(category).toUpperCase()}]
    </span>
  );
}
