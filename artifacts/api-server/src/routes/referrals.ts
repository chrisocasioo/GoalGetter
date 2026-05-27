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

      const items = await db.query.referrals.findMany({
        where: eq(referrals.referrerId, user.id),
        columns: {
          id: true,
          status: true,
          createdAt: true,
          creditedAt: true,
        },
        orderBy: (r, { desc }) => [desc(r.createdAt)],
      });

      let pendingCount = 0;
      let creditedCount = 0;
      for (const item of items) {
        if (item.status === "pending") pendingCount++;
        if (item.status === "credited") creditedCount++;
      }

      logger.debug({ userId: user.id, pendingCount, creditedCount }, "Referral stats fetched");

      res.json({
        pendingCount,
        creditedCount,
        referralLink: buildReferralLink(user.referralCode),
        items: items.map((item) => ({
          id: item.id,
          status: item.status,
          createdAt: item.createdAt?.toISOString() ?? new Date().toISOString(),
          creditedAt: item.creditedAt?.toISOString() ?? null,
        })),
      });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
export { buildReferralLink };
