import { Router, type IRouter, type Request, type NextFunction } from "express";
import { db } from "@workspace/db";
import { users, referrals } from "@workspace/db";
import { SyncUserBody } from "@workspace/api-zod";
import { eq } from "drizzle-orm";
import crypto from "node:crypto";

const router: IRouter = Router();

function generateReferralCode(): string {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

router.post("/users/sync", async (req: Request, res, next: NextFunction) => {
  try {
    const clerkUserId = req.clerkUserId ?? null;
    if (!clerkUserId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const bodyResult = SyncUserBody.safeParse(req.body);
    if (!bodyResult.success) {
      res.status(400).json({ error: "Invalid request body" });
      return;
    }

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

router.get("/users/me", async (req: Request, res, next: NextFunction) => {
  try {
    const clerkUserId = req.clerkUserId ?? null;
    if (!clerkUserId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const user = await db.query.users.findFirst({
      where: eq(users.clerkUserId, clerkUserId),
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

router.delete("/users/me", async (req: Request, res, next: NextFunction) => {
  try {
    const clerkUserId = req.clerkUserId ?? null;
    if (!clerkUserId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const user = await db.query.users.findFirst({
      where: eq(users.clerkUserId, clerkUserId),
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    await db.delete(users).where(eq(users.id, user.id));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
