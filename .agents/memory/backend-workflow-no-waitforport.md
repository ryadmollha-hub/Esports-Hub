---
name: Backend workflow — no waitForPort
description: The api-server console workflow must be configured without waitForPort on this project, or it times out even though the server starts fine.
---

# Backend workflow must omit waitForPort

## Rule
The "Start Backend" console workflow must NOT include `waitForPort: 8080`, even though the server correctly binds `0.0.0.0:8080` within ~2 seconds.

## Why
The platform port detector consistently times out (135–180 s) waiting for port 8080 despite the server logging "Server listening port: 8080" and curl confirming it responds. Adding `[[ports]] localPort = 8080` to `.replit` did not fix it. Removing `waitForPort` entirely lets the workflow start successfully — the process stays alive and the Vite proxy (`/api → localhost:8080`) works correctly.

## How to apply
When configuring or re-creating the "Start Backend" workflow, use:
```
configureWorkflow({
  name: "Start Backend",
  command: "PORT=8080 node --enable-source-maps /home/runner/workspace/artifacts/api-server/dist/index.mjs",
  outputType: "console"
  // no waitForPort
})
```
The backend must be rebuilt (`pnpm --filter @workspace/api-server run build`) before restarting the workflow after any code change.
