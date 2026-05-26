import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

let _cachedSecret: string | undefined;

function getSecret(): string {
  if (!_cachedSecret) {
    const s = process.env["SESSION_SECRET"];
    if (!s) {
      throw new Error("SESSION_SECRET environment variable is required.");
    }
    _cachedSecret = s;
  }
  return _cachedSecret;
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: "admin" | "teacher" | "parent";
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, getSecret(), { expiresIn: "7d" });
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ message: "Missing or invalid authorization header" });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, getSecret()) as any;
    req.user = payload as JwtPayload;
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
}

export function requireRole(...roles: Array<"admin" | "teacher" | "parent">) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ message: "Forbidden: insufficient permissions" });
      return;
    }
    next();
  };
}
