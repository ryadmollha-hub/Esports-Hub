---
name: Skill Rating System
description: FF Arena's unique custom-room skill rating feature — tables, engine, routes, and frontend.
---

## Architecture

**Two new DB tables** (lib/db/src/schema/ratings.ts):
- `player_ratings` — one row per user; rating, tier, totalMatches, totalKills, totalWins, bestRank
- `rating_history` — one row per (match, user); unique constraint `rating_history_match_user_uniq` on (match_id, user_id) is the idempotency lock

**Rating engine** (artifacts/api-server/src/lib/ratingEngine.ts):
- Placement pts: 1st=15, 2nd=12, 3rd=10, 4th=8, 5th=6, 6th=5, 7th=4, 8th=3, 9th=2, 10th=1, 11th+=0
- Kill pts: 3/kill, capped at 20 kills (max 60 pts)
- Tiers (ascending): Bronze 0, Silver 1000, Gold 2500, Platinum 5000, Diamond 8000, Master 12000, Heroic 16000
- Rating is additive only — never decreases

**Idempotency:** `INSERT ... ON CONFLICT DO NOTHING` on (match_id, user_id); checks returned rows — if 0, player already rated, skip player_ratings update.

**Backend routes** (artifacts/api-server/src/routes/ratings.ts):
- `GET /api/ratings/leaderboard` — top 100 by rating
- `GET /api/ratings/user/:userId` — single player rating + 20-entry history
- `GET /api/ratings/tiers` — static tier list

**Hooks:** Both result routes in matches.ts call `updateRatingsFromMatch(matchId, tournamentId)` fire-and-forget AFTER response is sent.

**Frontend:**
- `RankBadge.tsx` — reusable tier badge with emoji/color/name, sizes xs/sm/md/lg
- `/rankings` page — Top Players leaderboard (podium + table) + Tier Guide tab
- Profile page — rank card with tier icon, progress bar to next tier, links to /rankings
- Rankings link added to Navbar (both guest + user links) and MenuDrawer

**Why never decreases:** Keeps system friendly for newcomers; every match adds points.
