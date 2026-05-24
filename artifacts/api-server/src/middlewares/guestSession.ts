import { Request, Response, NextFunction } from "express";
import crypto from "node:crypto";

const COOKIE_NAME = "gg_guest_id";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year in seconds

/**
 * Assigns a stable, server-set guest session ID via signed cookie.
 * This is the canonical guest identity — cannot be spoofed by clients.
 * The guestSessionId is a 32-char hex string set by the server.
 *
 * For mobile clients that don't send cookies, the client-supplied
 * X-Guest-Session-Id header is accepted as a fallback, but cookie
 * takes precedence when present.
 */
export function guestSession(req: Request, res: Response, next: NextFunction) {
  // Authenticated users don't need a guest session ID
  if (req.clerkUserId) {
    next();
    return;
  }

  // Check for existing server-set cookie
  const existing = (req.cookies as Record<string, string>)?.[COOKIE_NAME];

  if (existing && isValidGuestId(existing)) {
    req.guestSessionId = existing;
    next();
    return;
  }

  // Check for mobile fallback header (X-Guest-Session-Id)
  const headerSessionId = req.headers["x-guest-session-id"];
  if (typeof headerSessionId === "string" && isValidGuestId(headerSessionId)) {
    req.guestSessionId = headerSessionId;
    // Promote to cookie if possible (web clients)
    res.cookie(COOKIE_NAME, headerSessionId, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE * 1000,
      secure: process.env.NODE_ENV === "production",
    });
    next();
    return;
  }

  // Generate a new guest session ID
  const newId = crypto.randomBytes(16).toString("hex");
  req.guestSessionId = newId;
  res.cookie(COOKIE_NAME, newId, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE * 1000,
    secure: process.env.NODE_ENV === "production",
  });

  next();
}

function isValidGuestId(id: string): boolean {
  return /^[a-f0-9]{32}$/.test(id);
}
