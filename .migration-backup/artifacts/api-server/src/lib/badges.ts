/**
 * Derives earned badge labels from a user's lifetime stats.
 * Badges are computed at runtime — no separate DB column needed.
 */
export interface UserStats {
  totalKills: number | null;
  totalWins: number | null;
  tournamentsPlayed: number | null;
}

export function computeBadges(stats: UserStats): string[] {
  const kills = stats.totalKills ?? 0;
  const wins = stats.totalWins ?? 0;
  const played = stats.tournamentsPlayed ?? 0;

  const badges: string[] = [];

  if (played >= 1) badges.push("First Blood");   // played at least one tournament
  if (played >= 5) badges.push("Veteran");         // seasoned competitor
  if (kills >= 10) badges.push("Killer");          // deadly
  if (kills >= 50) badges.push("Slayer");          // prolific killer
  if (wins >= 1)   badges.push("Champion");        // at least one win
  if (wins >= 3)   badges.push("Legend");          // multiple champion titles

  return badges;
}
