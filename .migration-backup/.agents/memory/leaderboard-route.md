---
name: Leaderboard route alias
description: Generated Orval client calls /leaderboard/global but Express router only had /leaderboard — fix with array route syntax.
---

**Rule:** When the Orval-generated client calls a sub-path (e.g., `/leaderboard/global`) that the Express router didn't register, add it using Express's array route syntax: `router.get(["/leaderboard", "/leaderboard/global"], handler)`.

**Why:** The OpenAPI spec had a `/leaderboard/global` operation but the implementation used the simpler `/leaderboard` path. The generated hook calls the spec path exactly, causing a 404.

**How to apply:** Always verify that every path in the generated `api.ts` URL functions matches an actual Express route. Use `grep -n "return \`/api"` on the generated file vs `grep -n "router\."` on the route files to find mismatches.
