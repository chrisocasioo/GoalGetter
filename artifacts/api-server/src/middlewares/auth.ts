import { Request, Response, NextFunction } from "express";

declare module "express" {
  interface Request {
    clerkUserId?: string;
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    req.clerkUserId = token;
  }
  next();
}
