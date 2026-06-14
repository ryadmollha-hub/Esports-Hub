---
name: JWT Auth Migration
description: Clerk fully removed and replaced with custom JWT auth (bcryptjs + jsonwebtoken). Key patterns for auth flow, token storage, and middleware.
---

## What changed
- Removed `@clerk/react`, `@clerk/themes` from frontend; `@clerk/express`, `@clerk/shared` from backend.
- Added `jsonwebtoken` + `bcryptjs` to api-server.
- Added `passwordHash text` column to `users` DB table (drizzle migration applied).

## Backend
- `artifacts/api-server/src/lib/jwt.ts` — sign/verify JWT tokens (secret: `JWT_SECRET` env or fallback)
- `artifacts/api-server/src/middlewares/jwtMiddleware.ts` — reads `Authorization: Bearer <token>` header, sets `req.userId`
- `artifacts/api-server/src/lib/clerkAuth.ts` — `safeGetUserId(req)` now reads `req.userId` set by JWT middleware (not Clerk)
- `artifacts/api-server/src/routes/auth.ts` — POST /auth/register, POST /auth/login, GET /auth/me, POST /auth/forgot-password, POST /auth/reset-password
- JWT payload: `{ userId: string (UUID stored in clerkId column), email, username }`
- Token expiry: 7 days. Reset token expiry: 1 hour.
- `passwordHash` is always stripped from API responses via `sanitize()` helper

## Frontend
- `artifacts/freefire-tournament/src/lib/AuthContext.tsx` — AuthProvider + useAuthContext + useAuth + useUser hooks
- Token stored in `localStorage` key `ff_auth_token`
- On mount: calls `setAuthTokenGetter(getStoredToken)` so all generated API client hooks auto-attach Bearer token
- `authFetch(path, init)` helper for manual fetches (dashboard wallet calls use this)
- Routes: `/sign-in` (login.tsx), `/sign-up` (signup.tsx), `/forgot-password` (forgot-password.tsx)

## Pattern rules
- `useAuth()` returns `{ isSignedIn, isLoaded, userId }` — compatible with old Clerk hook shape
- `useAuthContext()` returns full `{ user, isLoading, login, logout, register, authFetch, refreshUser }`
- Admin auth (BLACKCODE/USER505 + `x-admin-token` header) is completely separate and untouched
- The `clerkId` DB column is now used as a UUID generated at registration (not a Clerk ID)
- All backend routes already called `safeGetUserId(req)` — no route rewrites needed, only the implementation changed

**Why:** Clerk JS failed to load in Replit environment (`failed_to_load_clerk_js`). Self-hosted JWT is deployment-agnostic.
