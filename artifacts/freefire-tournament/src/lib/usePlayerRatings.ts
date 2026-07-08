/**
 * usePlayerRatings — shared hook for FF Arena Skill Rating lookups.
 *
 * Fetches the ratings leaderboard ONCE (React Query shared cache) and
 * returns a Map keyed by both `userId` and lowercase `playerName`.
 * All `PlayerIdentity` instances on the page share this single fetch —
 * no matter how many players are listed.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiBase } from "@/lib/apiBase";

export interface RatedPlayer {
  userId: string;
  playerName: string;
  rating: number;
  tier: string;
  totalMatches: number;
  totalWins: number;
}

async function fetchRatings(): Promise<RatedPlayer[]> {
  try {
    const res = await fetch(`${apiBase}/api/ratings/leaderboard`);
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

/**
 * Returns a lookup Map keyed by userId AND lowercase playerName.
 * Lookup by userId is preferred (exact), playerName is the fallback.
 */
export function usePlayerRatingMap(): Map<string, RatedPlayer> {
  const { data = [] } = useQuery<RatedPlayer[]>({
    queryKey: ["ratings-leaderboard"],
    queryFn: fetchRatings,
    staleTime: 5 * 60 * 1000,   // 5 min — data is stable
    refetchInterval: 60 * 1000, // refresh in background every 60s
    retry: false,
  });

  return useMemo(() => {
    const map = new Map<string, RatedPlayer>();
    for (const p of data) {
      if (p.userId)     map.set(p.userId, p);
      if (p.playerName) map.set(p.playerName.toLowerCase(), p);
    }
    return map;
  }, [data]);
}
