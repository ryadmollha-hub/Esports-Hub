import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { jwtMiddleware } from "./middlewares/jwtMiddleware";
import { apiLimiter } from "./middlewares/rateLimiter";
import { errorHandler } from "./middlewares/errorHandler";
import { maintenanceModeMiddleware } from "./middlewares/maintenanceMode";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.set("trust proxy", 1);

app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false,
  }),
);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

const allowedOrigin = process.env.ALLOWED_ORIGIN;
app.use(
  cors({
    credentials: true,
    origin: allowedOrigin ? allowedOrigin.split(",").map((s) => s.trim()) : true,
  }),
);
app.use(express.json({ limit: "6mb" }));
app.use(express.urlencoded({ extended: true, limit: "6mb" }));

app.use(apiLimiter);
app.use(jwtMiddleware);
app.use(maintenanceModeMiddleware);

// ─── Route param validation ───────────────────────────────────────────────────
// Reject non-positive-integer ID params before they reach route handlers.
// This covers all :id, :teamId, :memberId params across every route in the app.
for (const paramName of ["id", "teamId", "memberId"]) {
  app.param(paramName, (_req, res, next, value: string) => {
    const n = parseInt(value, 10);
    if (Number.isNaN(n) || n <= 0) {
      res.status(400).json({ error: `Invalid ${paramName}.` });
      return;
    }
    next();
  });
}

app.use("/api", router);

app.use(errorHandler);

export default app;
