# FF Arena — Free Fire Tournament Platform

A full-stack tournament management platform for Free Fire players. Users can register, join tournaments, manage their wallet, track stats, and compete on a leaderboard. Admins manage tournaments, registrations, and users via a dedicated panel.

## Run & Operate

Three Replit workflows run in parallel (managed via each artifact's `.replit-artifact/artifact.toml` — do not hand-edit `.replit` or call `configureWorkflow` for them):
- **`artifacts/api-server: API Server`** — `pnpm --filter @workspace/api-server run dev` (builds with esbuild, then runs the bundle). Served at `/api`.
- **`artifacts/freefire-tournament: web`** — `pnpm --filter @workspace/freefire-tournament run dev` (Vite dev server). Served at `/`.
- **`artifacts/mockup-sandbox: Component Preview Server`** — canvas component preview sandbox, unrelated to the FF Arena product.

The shared reverse proxy (`localhost:80`) routes `/api/*` to the API server and everything else to the frontend — there is no Vite dev-proxy hop between them.

Other useful commands:
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks (`@workspace/api-client-react`) and Zod schemas (`@workspace/api-zod`) from `lib/api-spec/openapi.yaml`
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` (Replit-managed, automatic). Secrets `JWT_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_SECRET` are stored as Replit Secrets.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 + Helmet + express-rate-limit
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (API server bundle), Vite (frontend)
- Auth: Custom JWT (bcryptjs + jsonwebtoken)

## Where things live

- `lib/api-spec/openapi.yaml` — API contract source of truth
- `lib/db/src/schema/` — DB schema source of truth (users, tournaments, registrations, wallet, auditLogs, …)
- `artifacts/api-server/src/routes/` — all API routes
- `artifacts/api-server/src/middlewares/` — JWT, rate limiter, error handler, maintenance mode
- `artifacts/api-server/src/lib/` — captcha, TOTP, fileValidator, auditLog, jwt, match scheduler
- `artifacts/freefire-tournament/src/lib/AuthContext.tsx` — auth state + inactivity logout
- `artifacts/freefire-tournament/src/pages/` — frontend pages

## Architecture decisions

- **No Clerk** — custom JWT auth with bcryptjs. `clerkId` column is now just the user UUID.
- **Dual admin auth** — `X-Admin-Token` header (panel) + JWT Bearer with `isAdmin=true` (regular users). Both handled by `requireAdmin()`.
- **Wallet balance** — computed at runtime (sum deposits − sum withdrawals); no dedicated balance column.
- **Audit log** — all auth events and admin actions logged to `audit_logs` table. Accessible via `GET /api/admin/audit-logs`.
- **CAPTCHA** — server-signed JWT math challenge (no external service). Token expires in 5 min.
- **TOTP 2FA** — pure-crypto TOTP for users. Setup: `POST /auth/setup-2fa` → `POST /auth/confirm-2fa`.

## Security features

- Rate limiting: 10 auth attempts/15 min, 5 registrations/hour/IP, 5 admin logins/15 min, 300 API req/min
- Math CAPTCHA on login and signup (server-side, JWT-signed)
- Account lockout: after 5 failed logins → 15-min lock
- Strong password: 8+ chars, uppercase + lowercase + number required
- Helmet HTTP security headers
- Audit log: all auth events, admin actions, bans, privilege changes
- Inactivity auto-logout: 30 min of no activity
- Registration locking: approved registrations cannot be rejected
- Duplicate UID prevention: same Free Fire UID can't register twice for one tournament
- File upload validation: base64 images only, JPEG/PNG/WebP/GIF, max 5 MB
- TOTP 2FA support for any user (optional setup)
- Error sanitization: 5xx errors show generic message, never stack traces

## Product

- User registration/login with JWT auth
- Tournament listing, registration with payment screenshot upload
- Wallet system: deposit, withdraw, balance tracking
- Team management
- Leaderboard (global + per-tournament)
- Admin panel: manage users, tournaments, registrations, announcements
- Audit log viewer for admins

## User preferences

- This project was imported from GitHub with frontend, backend routes/lib/middleware, DB schema, and the OpenAPI spec all stripped to stubs; the user asked to restore everything exactly from the preserved `.migration-backup/` copy (no rewrites, no logic changes) rather than rebuild.

## Gotchas

- Always run `pnpm --filter @workspace/db run push` after schema changes
- Run `pnpm --filter @workspace/api-spec run codegen` after OpenAPI changes
- `clerkId` column stores a local UUID — not a Clerk service ID
- CAPTCHA token is single-use by design (JWT expires in 5 min); always re-fetch after errors
- Bottom nav hides on `/admin*` routes (admin has its own sidebar)
- `lib/api-zod/src/index.ts` must only re-export `./generated/api` — do NOT also export `./generated/types`. Orval's Params types (e.g. query-param objects) are generated both as a runtime Zod schema in `generated/api.ts` and as a same-named TS type in `generated/types/`; re-exporting both from the barrel causes a `TS2308` ambiguous-export error during `typecheck:libs`.
- After running `pnpm --filter @workspace/api-spec run codegen`, check `lib/api-zod/src/index.ts` — some installed Orval versions auto-append `export * from './generated/types';` to that barrel on every run, which re-introduces the TS2308 collision above. Fix it back to a single-line export from `./generated/api` if that happens.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
