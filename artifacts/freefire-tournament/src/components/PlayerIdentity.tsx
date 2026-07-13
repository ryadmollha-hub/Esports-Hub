/**
 * PlayerIdentity — Global reusable player identity chip.
 *
 * Displays: [tier emoji] [playerName] [✓ verified]  (+ optional RP badge)
 *
 * Data source: shared `ratings-leaderboard` React Query cache (one fetch
 * across the entire page, zero extra network cost per instance).
 *
 * Falls back gracefully to plain text when no rating data exists — zero
 * visual change for unranked players, no layout disruption.
 *
 * Usage:
 *   <PlayerIdentity playerName="Rifat" />
 *   <PlayerIdentity playerName="Rifat" userId={p.userId} showRp />
 *   <PlayerIdentity playerName="Rifat" size="sm" />
 */
import { usePlayerRatingMap } from "@/lib/usePlayerRatings";
import { getTierInfo } from "@/components/RankBadge";

interface PlayerIdentityProps {
  /** Display name to show (required) */
  playerName: string;
  /** Optional userId for exact lookup (preferred over name matching) */
  userId?: string;
  /** Controls emoji / RP text size. Defaults to "xs" for compact list contexts. */
  size?: "xs" | "sm" | "md";
  /** Show the numeric RP value after the name */
  showRp?: boolean;
  /** Extra classes forwarded to the wrapper span */
  className?: string;
}

export default function PlayerIdentity({
  playerName,
  userId,
  size = "xs",
  showRp = false,
  className = "",
}: PlayerIdentityProps) {
  const ratingMap = usePlayerRatingMap();

  // userId lookup first (exact match), fall back to case-insensitive name lookup
  const data =
    (userId ? ratingMap.get(userId) : undefined) ??
    ratingMap.get(playerName.toLowerCase());

  // No rating found — render plain name, identical to previous behaviour
  if (!data) {
    return <span className={className}>{playerName}</span>;
  }

  const tier = getTierInfo(data.rating);

  const rpCls =
    size === "xs" ? "text-[9px]"
    : size === "sm" ? "text-[10px]"
    : "text-xs";

  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      {/* Tier emoji — always visible, shrinks never */}
      <span
        className="shrink-0 leading-none select-none"
        title={`${tier.name} · ${data.rating.toLocaleString()} RP`}
        aria-label={tier.name}
      >
        {tier.emoji}
      </span>

      {/* Player name — truncates naturally inside flex containers */}
      <span className="min-w-0 truncate">{playerName}</span>

      {/* Verified checkmark — rated player */}
      <span
        className={`${rpCls} font-black shrink-0 leading-none`}
        style={{ color: tier.color }}
        title="FF Arena verified rank"
        aria-label="Verified"
      >
        ✓
      </span>

      {/* Optional RP badge */}
      {showRp && (
        <span
          className={`${rpCls} font-black shrink-0 opacity-75`}
          style={{ color: tier.color }}
        >
          {data.rating.toLocaleString()} RP
        </span>
      )}
    </span>
  );
}
