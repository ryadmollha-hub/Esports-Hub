# FF Arena — Deployment Guide

FF Arena is a monorepo with two independently deployable services:

| Service | Stack | Recommended Host |
|---------|-------|-----------------|
| **API** (`artifacts/api-server`) | Express + Node.js | [Render](https://render.com) |
| **Frontend** (`artifacts/freefire-tournament`) | React + Vite | [Vercel](https://vercel.com) or [Netlify](https://netlify.com) |
| **Database** | PostgreSQL | Replit DB / Render Postgres / Supabase |

---

## 1. Prerequisites

- Node.js 20+
- pnpm 10+ (`npm i -g pnpm`)
- A PostgreSQL database
- Accounts on Render + Vercel (or Netlify)

---

## 2. GitHub Setup

1. Push this repository to GitHub (if not already done).
2. Keep `main` as your production branch.
3. Both Render and Vercel/Netlify will auto-deploy on every push to `main`.

---

## 3. Database Setup

### Option A — Replit Postgres (Development)
Already provisioned automatically. `DATABASE_URL` is injected into the environment.

### Option B — Render Postgres
1. In the Render dashboard, create a new **PostgreSQL** service.
2. Copy the **External Database URL**.
3. Set it as `DATABASE_URL` on your Render web service.

### Option C — Supabase
1. Create a project at [supabase.com](https://supabase.com).
2. Go to **Settings → Database → Connection string** (URI format).
3. Copy the connection string and set it as `DATABASE_URL`.

### Run migrations
After setting `DATABASE_URL`, apply the schema once:
```bash
pnpm --filter @workspace/db run push
```

---

## 4. Backend Deployment (Render)

A `render.yaml` file is included — Render will detect it automatically.

### Manual setup (if not using render.yaml)

1. Go to [dashboard.render.com](https://dashboard.render.com) → **New → Web Service**.
2. Connect your GitHub repository.
3. Set the following:

| Field | Value |
|-------|-------|
| **Root Directory** | `.` (repo root) |
| **Build Command** | `corepack enable pnpm && pnpm install --frozen-lockfile && pnpm --filter @workspace/db run push && pnpm --filter @workspace/api-server run build` |
| **Start Command** | `node --enable-source-maps artifacts/api-server/dist/index.mjs` |
| **Health Check Path** | `/health` |

### Required environment variables (Render → Environment)

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://...` |
| `JWT_SECRET` | Random 48-byte hex string (use Render's "Generate Value") | — |
| `ADMIN_USERNAME` | Admin panel username | `admin` |
| `ADMIN_PASSWORD` | Admin panel password | `Str0ng!Pass` |
| `ADMIN_SECRET` | Admin token secret (use Render's "Generate Value") | — |
| `NODE_ENV` | Must be `production` | `production` |
| `PORT` | Render injects this automatically | `10000` |
| `ALLOWED_ORIGIN` | Frontend URL(s), comma-separated | `https://ff-arena.vercel.app` |
| `LOG_LEVEL` | Pino log level | `info` |

> **Generate secrets:** In the Render dashboard, click the ✨ icon next to `JWT_SECRET` and `ADMIN_SECRET` to auto-generate secure random values.

### Verify the deployment
```
GET https://your-api.onrender.com/health
# → { "status": "ok" }
```

---

## 5. Frontend Deployment (Vercel)

A `vercel.json` is included at the repo root — Vercel will detect it automatically.

### Setup

1. Go to [vercel.com/new](https://vercel.com/new) → **Import Git Repository**.
2. Select your repository.
3. Vercel will auto-detect the `vercel.json` config. Accept defaults.

### Required environment variable (Vercel → Settings → Environment Variables)

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | Your Render API URL, e.g. `https://ff-arena-api.onrender.com` |

> **Important:** Do NOT add a trailing slash to `VITE_API_URL`.

### SPA routing
The `vercel.json` includes a catch-all rewrite so all routes (e.g. `/tournaments/:id`) serve `index.html` — client-side routing works out of the box.

---

## 6. Frontend Deployment (Netlify — alternative)

A `netlify.toml` is also included.

1. In Netlify dashboard → **Add new site → Import an existing project**.
2. Connect GitHub → select this repository.
3. Netlify picks up `netlify.toml` automatically.
4. Add environment variable: `VITE_API_URL` = your Render URL.

---

## 7. CORS Configuration

After deploying the frontend, update `ALLOWED_ORIGIN` on Render:

```
ALLOWED_ORIGIN=https://your-site.vercel.app,https://your-site.netlify.app
```

Multiple origins are comma-separated. The API also accepts requests from the Replit dev domain automatically when `ALLOWED_ORIGIN` is not set (development only).

---

## 8. Environment Variables — Full Reference

### API Server (`artifacts/api-server`)

See [`artifacts/api-server/.env.example`](artifacts/api-server/.env.example).

| Variable | Required | Default | Notes |
|----------|----------|---------|-------|
| `DATABASE_URL` | ✅ | — | Full Postgres URI |
| `JWT_SECRET` | ✅ | insecure dev fallback | Min 32 chars in production |
| `ADMIN_USERNAME` | ✅ | warns in dev | Admin login |
| `ADMIN_PASSWORD` | ✅ | warns in dev | Admin login |
| `ADMIN_SECRET` | ✅ | warns in dev | Admin token signing |
| `PORT` | — | `8080` | Injected by host |
| `NODE_ENV` | — | `development` | Set to `production` |
| `ALLOWED_ORIGIN` | — | allow-all | Comma-separated URLs |
| `LOG_LEVEL` | — | `info` | `trace`/`debug`/`info`/`warn`/`error` |

### Frontend (`artifacts/freefire-tournament`)

See [`artifacts/freefire-tournament/.env.example`](artifacts/freefire-tournament/.env.example).

| Variable | Required | Notes |
|----------|----------|-------|
| `VITE_API_URL` | Only in separate-host deploys | Backend URL, no trailing slash |

---

## 9. Build Commands Reference

Run from the **repository root** (`/`):

```bash
# Install all workspace dependencies
pnpm install

# Push database schema (run once or after schema changes)
pnpm --filter @workspace/db run push

# Build API server
pnpm --filter @workspace/api-server run build

# Build frontend
pnpm --filter @workspace/freefire-tournament run build

# Development (starts both concurrently via Replit workflows)
pnpm --filter @workspace/api-server run dev      # port 8080
pnpm --filter @workspace/freefire-tournament run dev   # port 5000

# Regenerate API client & Zod schemas from openapi.yaml
pnpm --filter @workspace/api-spec run codegen
```

---

## 10. Common Issues & Fixes

### `Cannot find package 'esbuild'`
Run `pnpm install` from the repo root before building. Dependencies must be installed from the workspace root, not inside a sub-package directory.

### Frontend shows a blank page after deploy
Ensure `vercel.json` / `netlify.toml` catch-all rewrites are in place (they are — included in this repo). Check that `VITE_API_URL` is set to your backend URL.

### API returns 401 on all requests after deploy
`JWT_SECRET` in production does not match the secret used to sign existing tokens. Generate a new one and have users log in again.

### CORS errors in the browser
Set `ALLOWED_ORIGIN` on the API server to your exact frontend URL (including `https://`, no trailing slash).

### Render health check fails / service won't start
- Verify `DATABASE_URL` is set and the Postgres instance is reachable.
- Check Render logs for the exact startup error.
- The server listens on `process.env.PORT` (Render injects `10000` automatically).

### Supabase SSL errors
Add `?sslmode=require` to your `DATABASE_URL` if Supabase rejects connections:
```
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require
```

### `pnpm install` fails on Render/Vercel
Ensure the build command starts with `corepack enable pnpm`. This activates the correct pnpm version declared in `package.json`.

---

## 11. Deployment Checklist

- [ ] `DATABASE_URL` set and schema pushed (`pnpm --filter @workspace/db run push`)
- [ ] `JWT_SECRET` set to a random 48-byte hex string
- [ ] `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_SECRET` set
- [ ] `NODE_ENV=production` on the API server
- [ ] `ALLOWED_ORIGIN` set to the deployed frontend URL
- [ ] `VITE_API_URL` set on Vercel/Netlify to the deployed API URL
- [ ] `GET /health` returns `{ "status": "ok" }` on the API
- [ ] Frontend loads and can reach the API (check Network tab)
- [ ] Admin login works at `/admin-login`
