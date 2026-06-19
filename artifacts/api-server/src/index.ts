import app from "./app";
import { logger } from "./lib/logger";
import { startMatchScheduler } from "./lib/matchScheduler";

// ─── Environment validation ───────────────────────────────────────────────────
const REQUIRED_ENV = ["DATABASE_URL", "JWT_SECRET", "ADMIN_USERNAME", "ADMIN_PASSWORD", "ADMIN_SECRET"] as const;
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length > 0) {
  if (process.env.NODE_ENV === "production") {
    console.error(`[FATAL] Missing required environment variables: ${missing.join(", ")}`);
    process.exit(1);
  } else {
    console.warn(`[WARN] Missing env vars (using insecure defaults for dev): ${missing.join(", ")}`);
  }
}

const rawPort = process.env["PORT"] ?? "8080";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  startMatchScheduler();
});
