import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";

export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction): void {
  logger.error({ err, method: req.method, url: req.url }, "Unhandled server error");

  const status = typeof err.status === "number" ? err.status
    : typeof err.statusCode === "number" ? err.statusCode
    : 500;

  res.status(status).json({
    success: false,
    message: status < 500
      ? (err.message ?? "An error occurred.")
      : "Something went wrong on our end. Please try again later.",
  });
}
