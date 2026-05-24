import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usageTracking, users } from "@workspace/db";
import { GetUsageQueryParams } from "@workspace/api-zod";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

const FREE_PLAN_LIMIT = 3;

router.get("/usage", async (req, res) => {
  const queryResult = GetUsageQueryParams.safeParse(req.query);

  const clerkUserId = (req as { clerkUserId?: string }).clerkUserId ?? null;
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
    res.json({
      planCount: 0,
      limit: -1,
      isPro: true,
      canGenerate: true,
    });
    return;
  }

  const guestSessionId = queryResult.success
    ? (queryResult.data.guestSessionId ?? null)
    : null;

  let planCount = 0;

  if (userId) {
    const usage = await db.query.usageTracking.findFirst({
      where: eq(usageTracking.userId, userId),
    });
    planCount = usage?.planCount ?? 0;
  } else if (guestSessionId) {
    const usage = await db.query.usageTracking.findFirst({
      where: eq(usageTracking.guestSessionId, guestSessionId),
    });
    planCount = usage?.planCount ?? 0;
  }

  res.json({
    planCount,
    limit: FREE_PLAN_LIMIT,
    isPro: false,
    canGenerate: planCount < FREE_PLAN_LIMIT,
  });
});

export default router;
