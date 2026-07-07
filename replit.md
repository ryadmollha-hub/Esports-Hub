# FF Arena — Free Fire Tournament Platform

A full-stack tournament management platform for Free Fire players. Users can register, join tournaments, manage their wallet, track stats, and compete on a leaderboard. Admins manage tournaments, registrations, and users via a dedicated panel.

## Run & Operate

On Replit two workflows run in parallel (see "Project" run button):
- **Start Backend** — `pnpm --filter @workspace/db run push && pnpm --filter @workspace/api-server run build && PORT=8080 node --enable-source-maps /home/runner/workspace/artifacts/api-server/dist/index.mjs` (console, port 8080). Self-healing: pushes DB schema and rebuilds on every start, so a fresh environment requires no manual steps.
- **Start application** — `pnpm install && PORT=5000 BASE_PATH=/ pnpm --filter @workspace/freefire-tournament run dev` (webview, port 5000). Vite proxies `/api` → `localhost:8080`.

Other useful commands:
- `pnpm --filter @workspace/api-server run build` — rebuild the API server (required before restarting Start Backend)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` (Replit-managed, automatic). Secrets `JWT_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_SECRET` are stored as Replit Secrets (not plain env vars).

## Stack

- pnpm workspaces, Node.js 20, TypeScript 5.9
- API: Express 5 + Helmet + express-rate-limit
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Auth: Custom JWT (bcryptjs + jsonwebtoken)

## Where things live

- `lib/db/src/schema/` — DB schema source of truth (users, tournaments, registrations, wallet, auditLogs, …)
- `artifacts/api-server/src/routes/` — all API routes
- `artifacts/api-server/src/middlewares/` — JWT, rate limiter, error handler
- `artifacts/api-server/src/lib/` — captcha, TOTP, fileValidator, auditLog, jwt
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

_Populate as you build._

## Gotchas

- Always run `pnpm --filter @workspace/db run push` after schema changes
- Run `pnpm --filter @workspace/api-spec run codegen` after OpenAPI changes
- `clerkId` column stores a local UUID — not a Clerk service ID
- CAPTCHA token is single-use by design (JWT expires in 5 min); always re-fetch after errors
- Bottom nav hides on `/admin*` routes (admin has its own sidebar)

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
