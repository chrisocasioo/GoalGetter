import { Router, type IRouter, type Request, type NextFunction } from "express";
import { db } from "@workspace/db";
import { usageTracking, users } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

const FREE_PLAN_LIMIT = 3;

router.get("/usage", async (req: Request, res, next: NextFunction) => {
  try {
    const clerkUserId = req.clerkUserId ?? null;
    let userId: number | null = null;
    let isPro = false;

    if (clerkUserId) {
      const user = await db.query.users.findFirst({
        where: eq(users.clerkUserId, clerkUserId),
      });
      if (user) {
        userId = user.id;
        isPro = user.subscriptionStatus === "pro";
      }
    }

    if (isPro) {
      res.json({ planCount: 0, limit: -1, isPro: true, canGenerate: true });
      return;
    }

    let planCount = 0;

    if (userId !== null) {
      const usage = await db.query.usageTracking.findFirst({
        where: eq(usageTracking.userId, userId),
      });
      planCount = usage?.planCount ?? 0;
    } else {
      // Use server-assigned guest session ID only
      const guestSessionId = req.guestSessionId ?? null;
      if (guestSessionId) {
        const usage = await db.query.usageTracking.findFirst({
          where: eq(usageTracking.guestSessionId, guestSessionId),
        });
        planCount = usage?.planCount ?? 0;
      }
    }

    res.json({
      planCount,
      limit: FREE_PLAN_LIMIT,
      isPro: false,
      canGenerate: planCount < FREE_PLAN_LIMIT,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
