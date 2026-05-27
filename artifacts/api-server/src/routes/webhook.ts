import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { users } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const WEBHOOK_SECRET = process.env.REVENUECAT_WEBHOOK_SECRET;

type RevenueCatEventType =
  | "INITIAL_PURCHASE"
  | "RENEWAL"
  | "CANCELLATION"
  | "UNCANCELLATION"
  | "EXPIRATION"
  | "BILLING_ISSUE"
  | "PRODUCT_CHANGE"
  | "SUBSCRIBER_ALIAS"
  | "TEST";

interface RevenueCatEvent {
  type: RevenueCatEventType;
  app_user_id: string;
  aliases?: string[];
  expiration_at_ms?: number | null;
  product_id?: string;
}

interface RevenueCatWebhookPayload {
  event: RevenueCatEvent;
  api_version: string;
}

router.post(
  "/webhooks/revenuecat",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Verify Authorization header when secret is configured
      if (WEBHOOK_SECRET) {
        const authHeader = req.headers.authorization ?? "";
        const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
        if (token !== WEBHOOK_SECRET) {
          res.status(401).json({ error: "Unauthorized" });
          return;
        }
      }

      const payload = req.body as RevenueCatWebhookPayload;
      if (!payload?.event?.type || !payload?.event?.app_user_id) {
        res.status(400).json({ error: "Invalid payload" });
        return;
      }

      const { event } = payload;
      const clerkUserId = event.app_user_id;

      logger.info({ eventType: event.type, clerkUserId }, "RevenueCat webhook received");

      const user = await db.query.users.findFirst({
        where: eq(users.clerkUserId, clerkUserId),
      });

      if (!user) {
        // User not found — could be an alias or not yet synced; ack and move on
        logger.warn({ clerkUserId }, "RevenueCat webhook: user not found");
        res.status(200).json({ received: true });
        return;
      }

      const expiresAt = event.expiration_at_ms
        ? new Date(event.expiration_at_ms)
        : null;

      switch (event.type) {
        case "INITIAL_PURCHASE":
        case "RENEWAL":
        case "UNCANCELLATION":
          await db
            .update(users)
            .set({
              subscriptionStatus: "pro",
              subscriptionExpiresAt: expiresAt,
              revenuecatUserId: clerkUserId,
              updatedAt: new Date(),
            })
            .where(eq(users.id, user.id));
          logger.info({ clerkUserId, eventType: event.type }, "User upgraded to Pro");
          break;

        case "CANCELLATION":
          // Keep pro until expiry — just record the expiry date
          await db
            .update(users)
            .set({
              subscriptionExpiresAt: expiresAt,
              updatedAt: new Date(),
            })
            .where(eq(users.id, user.id));
          logger.info({ clerkUserId }, "Subscription cancelled — keeping Pro until expiry");
          break;

        case "EXPIRATION":
        case "BILLING_ISSUE":
          await db
            .update(users)
            .set({
              subscriptionStatus: "free",
              subscriptionExpiresAt: null,
              updatedAt: new Date(),
            })
            .where(eq(users.id, user.id));
          logger.info({ clerkUserId, eventType: event.type }, "User downgraded to Free");
          break;

        default:
          logger.info({ eventType: event.type }, "RevenueCat webhook: unhandled event type");
      }

      res.status(200).json({ received: true });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
