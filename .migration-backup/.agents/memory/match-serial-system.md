---
name: Match Serial Number System
description: How permanent T-XXXX/C-XXXX serial numbers are generated and stored for tournament/community matches.
---

## Rule
Every new match gets a permanent, globally-unique serial number assigned at creation time. Numbers never reset, never reuse after deletion, and grow naturally past 9999.

- Tournament matches → `T-0001`, `T-0002`, … (prefix `T-`)
- Community matches → `C-0001`, `C-0002`, … (prefix `C-`)

## Schema
`matchCountersTable` in `lib/db/src/schema/matches.ts`:
- `type` TEXT PK (`'tournament'` | `'community'`)
- `lastValue` INTEGER (monotonic counter)

`serialNumber` TEXT nullable on both `matchesTable` and `userMatchesTable`.

## Generator
`artifacts/api-server/src/lib/matchSerial.ts` — `nextMatchSerial(type)`:
- Uses Drizzle `INSERT…onConflictDoUpdate…returning()` which is atomic (no locks needed).
- The RETURNING clause gives the value AFTER the update, so it's always the new counter value.

## How to apply
- Call before `db.insert(matchesTable)` or `db.insert(userMatchesTable)`.
- Pass result as `serialNumber` in insert values.
- Existing rows were backfilled (T-0001…C-0001 etc.) via inline Node script; counters initialized accordingly.

## Admin UI
- `roomHideAt` on `matchesTable` — admin sets "Close (min after start)" dropdown. `null` = auto-hide at scheduledAt.
- `PATCH /matches/:id/room` accepts `roomReleaseMinutesBefore` (−1 = immediate) and `roomHideMinutesAfter`.
- Status indicator computed client-side from `roomReleaseAt` / `roomHideAt` vs `Date.now()`.
- "Manual Release" button sends `roomReleaseMinutesBefore: -1` directly to the API.
- "Players" button fetches `GET /tournaments/:id/registrations` and lists approved entries.
