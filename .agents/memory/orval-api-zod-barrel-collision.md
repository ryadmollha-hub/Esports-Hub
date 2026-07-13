---
name: Orval api-zod barrel collision
description: Why lib/api-zod/src/index.ts must only re-export ./generated/api, and why this keeps reappearing after codegen.
---

`lib/api-zod/src/index.ts` must contain exactly one line: `export * from "./generated/api";`. Do not add `export * from "./generated/types";`.

**Why:** with `schemas: { path: "generated/types", type: "typescript" }` in the zod orval config, request/query param objects (e.g. `ListXParams`) get emitted twice — once as a runtime Zod schema in `generated/api.ts`, once as a same-named TS type in `generated/types/`. Re-exporting both via `export *` from the barrel is an ambiguous export and fails `tsc --build` with `TS2308 ... has already exported a member named '...'`.

**How to apply:** after running `pnpm --filter @workspace/api-spec run codegen`, check `lib/api-zod/src/index.ts` — some installed Orval versions (observed: 8.20.0) auto-append the `generated/types` line to this file on every codegen run, silently re-introducing the collision even if it was fixed before. Re-check and fix it back to the single-line form after every codegen run, then re-run `pnpm -w run typecheck:libs` to confirm.
