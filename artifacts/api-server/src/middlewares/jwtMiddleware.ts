import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "../lib/jwt";

export function jwtMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) {
    const token = auth.slice(7);
    const payload = verifyToken(token);
    if (payload) {
      (req as any).userId = payload.userId;
      (req as any).jwtUser = payload;
    }
  }
  next();
}
