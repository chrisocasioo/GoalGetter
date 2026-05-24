import { Request, Response, NextFunction } from "express";

declare module "express" {
  interface Request {
    clerkUserId?: string;
    guestSessionId?: string;
    resolvedUserId?: number | null;
  }
}

/**
 * Extracts Clerk user ID from Authorization: Bearer <token> header.
 * Full JWT verification is added in the Auth task (Task #2).
 * guestSessionId is set by the guestSession middleware (see guestSession.ts).
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    if (token) {
      req.clerkUserId = token;
    }
  }
  next();
}
