#!/bin/bash
set -e

echo "[post-merge] Installing dependencies..."
pnpm install --frozen-lockfile

echo "[post-merge] Type-checking libs..."
pnpm run typecheck:libs

echo "[post-merge] Pushing database schema..."
pnpm --filter @workspace/db run push

echo "[post-merge] Building API server..."
pnpm --filter @workspace/api-server run build

echo "[post-merge] Done. Project is ready to run."
