"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GraphCanvas } from "./GraphCanvas";
import { CategoryBadge } from "./CategoryBadge";
import { LockBodyScroll } from "./LockBodyScroll";
import { categoryLabel } from "@/lib/search-engine/format";
import type { GraphOut, HubOut, ClusterOut } from "@/lib/search-engine/types";

function HubRow({ h, metric }: { h: HubOut; metric: "pagerank" | "betweenness" }) {
  const val =
    metric === "pagerank"
      ? ((h.pagerank ?? 0) * 1000).toFixed(1)
      : ((h.betweenness ?? 0) * 100).toFixed(1);
  return (
    <Link
      href={`/channel/${h.id}`}
      className="flex items-center justify-between rounded px-2 py-1.5 transition-colors hover:bg-surface-2/60"
    >
      <div className="min-w-0">
        <div className="truncate text-sm text-fg-bright">{h.title}</div>
        <div className="font-mono text-[10px] text-muted">
          {h.category ? categoryLabel(h.category) : "—"} · in {h.in_degree ?? 0}
        </div>
      </div>
      <span className="ml-3 shrink-0 font-mono text-xs text-accent">{val}</span>
    </Link>
  );
}

export function GraphView({
  graph,
  hubs,
  bridges,
  clusters,
}: {
  graph: GraphOut;
  hubs: HubOut[];
  bridges: HubOut[];
  clusters: ClusterOut[];
}) {
  // Open by default on desktop, closed on mobile (the drawer covers the screen).
  const [panel, setPanel] = useState(false);
  useEffect(() => {
    setPanel(window.matchMedia("(min-width: 640px)").matches);
  }, []);

  return (
    <>
      <LockBodyScroll />
      <GraphCanvas data={graph} />

      {/* Floating metrics drawer */}
      <button
        onClick={() => setPanel((p) => !p)}
        className="fixed right-3 top-[70px] z-30 rounded border border-border bg-surface/90 px-3 py-1.5 font-mono text-xs text-muted backdrop-blur hover:border-accent/40 hover:text-accent sm:right-4"
      >
        {panel ? "hide metrics" : "metrics"}
      </button>

      {panel && (
        <div className="fixed inset-x-3 bottom-3 top-[112px] z-20 space-y-3 overflow-y-auto rounded-lg border border-border bg-surface/95 p-4 backdrop-blur sm:inset-x-auto sm:right-4 sm:w-80">
          <div>
            <div className="mono-label mb-2">top hubs · influence</div>
            <div className="space-y-0.5">
              {hubs.map((h) => (
                <HubRow key={h.id} h={h} metric="pagerank" />
              ))}
            </div>
          </div>

          <div className="border-t border-border pt-3">
            <div className="mono-label mb-2">bridges · connectors</div>
            {bridges.length === 0 ? (
              <p className="font-mono text-[11px] text-muted">{"// graph too sparse"}</p>
            ) : (
              <div className="space-y-0.5">
                {bridges.map((h) => (
                  <HubRow key={h.id} h={h} metric="betweenness" />
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-border pt-3">
            <div className="mono-label mb-2">communities</div>
            <div className="space-y-2">
              {clusters.map((c) => (
                <div key={c.cluster_id} className="rounded border border-border p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-fg-bright">
                      cluster {c.cluster_id}
                    </span>
                    <span className="font-mono text-[10px] text-muted">
                      {c.size}
                    </span>
                  </div>
                  <div className="mt-1.5">
                    <CategoryBadge category={c.top_category} />
                  </div>
                  <div className="mt-1.5 truncate font-mono text-[10px] text-muted">
                    {c.top_titles.slice(0, 3).join(" · ")}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
