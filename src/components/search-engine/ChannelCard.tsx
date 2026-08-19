import Link from "next/link";
import type { ChannelSummary } from "@/lib/search-engine/types";
import { formatMembers } from "@/lib/search-engine/format";
import { CategoryBadge } from "./CategoryBadge";
import { ScoreRing } from "./ScoreBar";
import { Avatar } from "./Avatar";

export function ChannelCard({
  channel,
  rank,
}: {
  channel: ChannelSummary;
  rank?: number;
}) {
  return (
    <Link
      href={`/explorer/channel/${channel.id}`}
      className="group block broadsheet-card p-4 sm:p-5 font-teletype transition-all"
    >
      <div className="flex items-start gap-4">
        <Avatar username={channel.username} title={channel.title} size={44} />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {rank != null && (
              <span className="text-[11px] text-[#d97706] font-bold">
                [{String(rank).padStart(2, "0")}]
              </span>
            )}
            <h3 className="truncate font-bold text-sm text-[#f4f0e6] group-hover:text-[#d97706] transition-colors uppercase">
              {channel.title}
            </h3>
            {channel.is_marketplace && (
              <span className="stamp-badge !text-[9px] !py-0 !px-1">
                MARKET
              </span>
            )}
          </div>

          <div className="mt-1 flex items-center gap-2 text-[11px] text-[#a39e93]">
            {channel.username ? (
              <span className="truncate">@{channel.username}</span>
            ) : (
              <span className="text-[#a39e93]/60">PRIVATE WIRE</span>
            )}
            <span>·</span>
            <span>{formatMembers(channel.member_count)} SUBSCRIBERS</span>
          </div>

          {channel.why_recommended && (
            <p className="mt-2 line-clamp-2 text-xs font-sans leading-relaxed text-[#d6d0c2]">
              {channel.why_recommended}
            </p>
          )}

          <div className="mt-3">
            <CategoryBadge category={channel.category} />
          </div>
        </div>

        <ScoreRing score={channel.final_score} />
      </div>
    </Link>
  );
}
