import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { users, referrals } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const APP_SCHEME = "mobile";

function buildReferralLink(code: string): string {
  return `${APP_SCHEME}://ref/${code}`;
}

router.get(
  "/referrals/me",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await db.query.users.findFirst({
        where: eq(users.clerkUserId, req.clerkUserId!),
      });

      if (!user) {
        res.status(404).json({ error: "User not found. Call /users/sync first." });
        return;
      }

      const statsRows = await db
        .select({
          status: referrals.status,
          count: sql<number>`count(*)::int`,
        })
        .from(referrals)
        .where(eq(referrals.referrerId, user.id))
        .groupBy(referrals.status);

      let pendingCount = 0;
      let creditedCount = 0;
      for (const row of statsRows) {
        if (row.status === "pending") pendingCount = row.count;
        if (row.status === "credited") creditedCount = row.count;
      }

      logger.debug({ userId: user.id, pendingCount, creditedCount }, "Referral stats fetched");

      res.json({
        pendingCount,
        creditedCount,
        referralLink: buildReferralLink(user.referralCode),
      });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
export { buildReferralLink };
