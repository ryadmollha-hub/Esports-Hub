---
name: Community Match System
description: Architecture and conventions for the user_matches / community match feature
---

## Location
- Community matches are displayed only on the **Tournaments page** (`/tournaments`), not on home.
- The global `CreateMatchModal` is rendered once in `App.tsx` and controlled via `CreateMatchContext` (`openCreateMatch()` / `closeCreateMatch()`).

## DB Columns
- `user_matches`: matchName (text nullable), passwordHash (text nullable), status, entryFee, filledSlots, maxSlots
- `user_match_joins`: inGameName (text nullable), gameUid (text nullable)

## API Conventions
- `stripMatch()` helper in userMatches.ts removes `passwordHash` from any response and adds `isPasswordProtected: boolean`.
- POST /user-matches accepts `password` (plain), hashes it with bcrypt before storing.
- POST /user-matches/:id/join requires `inGameName` + `gameUid` (both required); verifies bcrypt if match has passwordHash.
- Admin approve route allows `entryFee >= 0` (free matches allowed).

**Why:**
Password never leaves the server; only `isPasswordProtected` flag is exposed to clients. IGN + UID are needed so match creator can identify participants.

## Profile Integration
- Profile → "My Match Requests" (section `my-matches`) shows user's own created matches.
- Cards show: matchName (or fallback), isPasswordProtected lock badge, prize pool, entry fee, player count (filledSlots/maxSlots), status badge.
