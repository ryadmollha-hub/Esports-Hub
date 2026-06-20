---
name: Prize Distribution System
description: Per-match prize distribution with team splitting, kill rewards, duplicate prevention, and admin report.
---

## Schema changes
- `matchesTable`: added `prizeDistributed` (boolean, default false) + `prizeDistributedAt` (timestamp)
- `walletTransactionsTable`: added `matchId` (integer, nullable) for match-level prize tracking

## Backend route
`artifacts/api-server/src/routes/prizeDistribution.ts` — registered in routes/index.ts

### Endpoints
- `GET /admin/tournaments/:tournamentId/prize-registrations` — returns approved registrations enriched with `teamMembersArr` (parsed JSON) and tournament prize tiers
- `POST /admin/matches/:matchId/distribute-prizes` — body: `{preview, placements:[{registrationId,rank}], teamKills:[{registrationId,captainKills,memberKills[]}]}`; if `preview=true` returns calculation only; otherwise inserts wallet_transactions and marks match as distributed
- `GET /admin/prize-distributions` — report of all distributed matches with their transactions

## Prize calculation logic
- Rank prize / total team members (captain + additional) = each member's share
- Kill reward = kills × perKillReward (individual, per player)
- Captain: userId from registration.userId directly
- Additional members: looked up by freefireUid in usersTable → if no account, skipped (noted in preview as "no account")
- Two separate wallet transactions per eligible player: one for rank share, one for kill reward (if >0)

## Duplicate prevention
- Check `match.prizeDistributed` before executing; return 409 if already done
- After distribution, set `prizeDistributed=true` + `prizeDistributedAt=now()` + `status=completed` on match

## Admin UI (admin.tsx matches tab)
- "💰 Prizes" / "✅ Prizes Paid" button added to each match card header (yellow/green)
- Prize distribution panel (expandedPrize state per matchId):
  - Shows tournament prize tiers + per kill reward
  - Per approved team: placement dropdown (None/1st/2nd/3rd) + kill inputs per player (captain ★ + additional members)
  - "🔍 Preview Prizes" → calls preview endpoint, shows breakdown per player with "no account" warning
  - "🏆 Distribute Prizes" button, disabled after distribution
- "📊 Prize Distribution History" collapsible section at bottom of Matches tab; per-match expandable to show all wallet transactions

**Why:**
- teamMembers JSON only stores `{uid, name}` — no userId for additional members; lookup by freefireUid is the only way to credit them
- `matchId` on wallet_transactions enables efficient per-match reporting without parsing notes
