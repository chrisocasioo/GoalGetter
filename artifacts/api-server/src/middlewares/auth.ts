import { Request, Response, NextFunction } from "express";
import { getAuth } from "@clerk/express";

declare module "express" {
  interface Request {
    clerkUserId?: string;
    guestSessionId?: string;
    resolvedUserId?: number | null;
  }
}

/**
 * Extracts the verified Clerk user ID from the session.
 * Clerk's clerkMiddleware() must run before this — it validates the JWT
 * and populates the auth state that getAuth() reads.
 *
 * Sets req.clerkUserId on authenticated requests; leaves it undefined otherwise.
 * guestSessionId is set by the guestSession middleware.
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const auth = getAuth(req);
  if (auth?.userId) {
    req.clerkUserId = auth.userId;
  }
  next();
}

/**
 * Middleware that requires a valid Clerk session.
 * Returns 401 if the request is not authenticated.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = getAuth(req);
  if (!auth?.userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  req.clerkUserId = auth.userId;
  next();
}
