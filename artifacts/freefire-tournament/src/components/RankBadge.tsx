// ── RankBadge ─────────────────────────────────────────────────────────────────
// Displays the FF Arena Skill Rank tier badge for a player.
// Sizes: "xs" | "sm" | "md" | "lg"

export interface TierInfo {
  name: string;
  color: string;
  emoji: string;
  min: number;
}

export const TIERS: TierInfo[] = [
  { name: "Heroic",    min: 16000, color: "#ff4444", emoji: "🔥" },
  { name: "Master",   min: 12000, color: "#c084fc", emoji: "👑" },
  { name: "Diamond",  min:  8000, color: "#38bdf8", emoji: "💎" },
  { name: "Platinum", min:  5000, color: "#34d399", emoji: "🔷" },
  { name: "Gold",     min:  2500, color: "#fbbf24", emoji: "🥇" },
  { name: "Silver",   min:  1000, color: "#94a3b8", emoji: "🥈" },
  { name: "Bronze",   min:     0, color: "#b45309", emoji: "🥉" },
];

export function getTierInfo(rating: number): TierInfo {
  return TIERS.find((t) => rating >= t.min) ?? TIERS[TIERS.length - 1];
}

// Progress to next tier (0–100%)
export function getTierProgress(rating: number): number {
  const current = getTierInfo(rating);
  const currentIdx = TIERS.findIndex((t) => t.name === current.name);
  const next = TIERS[currentIdx - 1]; // TIERS is sorted desc
  if (!next) return 100; // already top tier
  const range = next.min - current.min;
  const progress = rating - current.min;
  return Math.min(100, Math.round((progress / range) * 100));
}

interface RankBadgeProps {
  rating: number;
  size?: "xs" | "sm" | "md" | "lg";
  showRating?: boolean;
  className?: string;
}

export default function RankBadge({ rating, size = "sm", showRating = false, className = "" }: RankBadgeProps) {
  const tier = getTierInfo(rating);

  const sizeMap = {
    xs: { emoji: "text-sm",  text: "text-[10px]", gap: "gap-0.5", px: "px-1.5 py-0.5" },
    sm: { emoji: "text-base", text: "text-xs",     gap: "gap-1",   px: "px-2 py-0.5"   },
    md: { emoji: "text-xl",   text: "text-sm",     gap: "gap-1.5", px: "px-2.5 py-1"   },
    lg: { emoji: "text-2xl",  text: "text-base",   gap: "gap-2",   px: "px-3 py-1.5"   },
  }[size];

  return (
    <span
      className={`inline-flex items-center ${sizeMap.gap} ${sizeMap.px} rounded-full font-black border ${className}`}
      style={{
        background: `${tier.color}18`,
        borderColor: `${tier.color}50`,
        color: tier.color,
      }}
    >
      <span className={sizeMap.emoji}>{tier.emoji}</span>
      <span className={`${sizeMap.text} uppercase tracking-wide`}>{tier.name}</span>
      {showRating && (
        <span className={`${sizeMap.text} opacity-70`}>· {rating.toLocaleString()}</span>
      )}
    </span>
  );
}
