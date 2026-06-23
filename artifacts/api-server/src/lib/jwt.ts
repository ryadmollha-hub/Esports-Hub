import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET ?? "ff-arena-jwt-secret-2026";
const JWT_EXPIRES_IN = "7d";

export interface JwtPayload {
  userId: string;
  email: string;
  username: string | null;
  isAdmin?: boolean;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export function signResetToken(userId: string): string {
  return jwt.sign({ userId, type: "reset" }, JWT_SECRET, { expiresIn: "1h" });
}

export function verifyResetToken(token: string): { userId: string } | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    if (payload.type !== "reset") return null;
    return { userId: payload.userId };
  } catch {
    return null;
  }
}
