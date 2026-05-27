import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { users, referrals } from "@workspace/db";
import { SyncUserBody } from "@workspace/api-zod";
import { eq } from "drizzle-orm";
import crypto from "node:crypto";
import { requireAuth } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function generateReferralCode(): string {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

// POST /users/sync — create or return user record on first sign-in
router.post("/users/sync", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bodyResult = SyncUserBody.safeParse(req.body);
    if (!bodyResult.success) {
      res.status(400).json({ error: "Invalid request body" });
      return;
    }

    const clerkUserId = req.clerkUserId!;
    const { email, referralCode: incomingReferralCode } = bodyResult.data;

    const existing = await db.query.users.findFirst({
      where: eq(users.clerkUserId, clerkUserId),
    });

    if (existing) {
      res.json({
        id: existing.id,
        clerkUserId: existing.clerkUserId,
        email: existing.email,
        referralCode: existing.referralCode,
        subscriptionStatus: existing.subscriptionStatus,
        subscriptionExpiresAt: existing.subscriptionExpiresAt,
        createdAt: existing.createdAt,
      });
      return;
    }

    let referredBy: string | null = null;
    let referrerId: number | null = null;

    if (incomingReferralCode) {
      const referrer = await db.query.users.findFirst({
        where: eq(users.referralCode, incomingReferralCode),
      });
      if (referrer) {
        referredBy = incomingReferralCode;
        referrerId = referrer.id;
      }
    }

    let referralCode = generateReferralCode();
    let attempts = 0;
    while (attempts < 5) {
      const clash = await db.query.users.findFirst({
        where: eq(users.referralCode, referralCode),
      });
      if (!clash) break;
      referralCode = generateReferralCode();
      attempts++;
    }

    const [newUser] = await db
      .insert(users)
      .values({
        clerkUserId,
        email,
        referralCode,
        referredBy,
        subscriptionStatus: "free",
      })
      .returning();

    if (referrerId !== null) {
      await db.insert(referrals).values({
        referrerId,
        refereeId: newUser.id,
        status: "pending",
      });
    }

    res.json({
      id: newUser.id,
      clerkUserId: newUser.clerkUserId,
      email: newUser.email,
      referralCode: newUser.referralCode,
      subscriptionStatus: newUser.subscriptionStatus,
      subscriptionExpiresAt: newUser.subscriptionExpiresAt,
      createdAt: newUser.createdAt,
    });
  } catch (err) {
    next(err);
  }
});

// GET /users/me — get authenticated user profile
router.get("/users/me", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.clerkUserId, req.clerkUserId!),
    });

    if (!user) {
      res.status(404).json({ error: "User not found. Call /users/sync first." });
      return;
    }

    res.json({
      id: user.id,
      clerkUserId: user.clerkUserId,
      email: user.email,
      referralCode: user.referralCode,
      subscriptionStatus: user.subscriptionStatus,
      subscriptionExpiresAt: user.subscriptionExpiresAt,
      createdAt: user.createdAt,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /account — Apple-required account deletion endpoint.
 * Also aliased at DELETE /users/me for API consistency.
 * Deletes the user from Clerk AND removes all local data via DB cascade.
 */
async function handleDeleteAccount(req: Request, res: Response, next: NextFunction) {
  try {
    const clerkUserId = req.clerkUserId!;

    const user = await db.query.users.findFirst({
      where: eq(users.clerkUserId, clerkUserId),
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Hard delete from local DB — cascade via FK constraints removes plans, steps, usage, referrals
    await db.delete(users).where(eq(users.id, user.id));

    // Delete from Clerk — do this after DB deletion so local data is always cleaned up
    const clerkRes = await fetch(`https://api.clerk.com/v1/users/${clerkUserId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (!clerkRes.ok && clerkRes.status !== 404) {
      // Log the failure but don't block the response — local data is already gone
      logger.warn(
        { clerkUserId, status: clerkRes.status },
        "Failed to delete Clerk user; local data already removed",
      );
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

router.delete("/account", requireAuth, handleDeleteAccount);
router.delete("/users/me", requireAuth, handleDeleteAccount);

/**
 * POST /subscription/sync
 * Called by the mobile client immediately after a successful RevenueCat purchase
 * to update the DB without waiting for the webhook. Auth-required (Clerk JWT).
 * Only upgrades (→ pro); downgrades are handled exclusively via webhook.
 */
router.post(
  "/subscription/sync",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const clerkUserId = req.clerkUserId!;
      const user = await db.query.users.findFirst({
        where: eq(users.clerkUserId, clerkUserId),
      });

      if (!user) {
        res.status(404).json({ error: "User not found. Call /users/sync first." });
        return;
      }

      // Optimistically mark as pro. The RevenueCat webhook will later confirm
      // (INITIAL_PURCHASE) or override (EXPIRATION) this status.
      const expiresAt = req.body?.expirationDate
        ? new Date(req.body.expirationDate)
        : null;

      await db
        .update(users)
        .set({
          subscriptionStatus: "pro",
          ...(expiresAt ? { subscriptionExpiresAt: expiresAt } : {}),
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      logger.info({ clerkUserId }, "Subscription synced to Pro via client post-purchase");

      res.json({ subscriptionStatus: "pro" });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
