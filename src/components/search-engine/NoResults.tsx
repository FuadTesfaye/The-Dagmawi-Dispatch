import Link from "next/link";
import { listCategories } from "@/lib/search-engine/api";
import { categoryLabel } from "@/lib/search-engine/format";
import type { CategoryOut } from "@/lib/search-engine/types";

const POPULAR = [
  "phones addis",
  "crypto signals",
  "jobs ethiopia",
  "car market",
  "real estate",
  "electronics deals",
];

/**
 * Shown when a search returns nothing. Instead of a dead end, it guides the
 * user to real categories (from the live index) and popular example searches.
 */
export async function NoResults({ query }: { query: string }) {
  let categories: CategoryOut[] = [];
  try {
    categories = await listCategories();
  } catch {
    // categories are a nice-to-have here; ignore if backend hiccups
  }

  const topCategories = categories
    .filter((c) => c.category !== "spam")
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="panel px-5 py-8 text-center">
        <div className="font-mono text-sm text-muted">
          <span className="text-accent">{"//"}</span> no channels matched{" "}
          <span className="text-fg-bright">&quot;{query}&quot;</span>
        </div>
        <p className="mx-auto mt-2 max-w-sm text-xs text-muted/70">
          The term might not be indexed yet. Try a broader word, or explore what
          we&apos;ve already discovered below.
        </p>
      </div>

      {topCategories.length > 0 && (
        <div>
          <div className="mb-3 mono-label">browse categories</div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {topCategories.map((c) => (
              <Link
                key={c.category}
                href={`/search?q=${encodeURIComponent(c.category)}`}
                className="panel flex items-center justify-between px-3 py-2.5 transition-colors hover:border-border-bright hover:bg-surface-2/60"
              >
                <span className="text-sm text-fg">
                  {categoryLabel(c.category)}
                </span>
                <span className="font-mono text-xs text-muted">
                  {c.channel_count}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="mb-3 mono-label">popular searches</div>
        <div className="flex flex-wrap gap-2">
          {POPULAR.map((p) => (
            <Link
              key={p}
              href={`/search?q=${encodeURIComponent(p)}`}
              className="rounded border border-border px-3 py-1.5 font-mono text-xs text-muted transition-colors hover:border-accent/40 hover:text-accent"
            >
              {p}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
