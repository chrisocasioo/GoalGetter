import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { users, referrals } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const WEBHOOK_SECRET = process.env.REVENUECAT_WEBHOOK_SECRET;

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * When a referee completes their first purchase, credit the referrer with 1 free month of Pro.
 * Idempotent: only credits once (pending → credited transition).
 */
async function creditReferrerIfApplicable(refereeDbId: number, refereeClerkId: string): Promise<void> {
  try {
    const pendingReferral = await db.query.referrals.findFirst({
      where: and(eq(referrals.refereeId, refereeDbId), eq(referrals.status, "pending")),
    });

    if (!pendingReferral) {
      return;
    }

    const referrer = await db.query.users.findFirst({
      where: eq(users.id, pendingReferral.referrerId),
    });

    if (!referrer) {
      logger.warn(
        { referralId: pendingReferral.id, referrerId: pendingReferral.referrerId },
        "Referral referrer not found",
      );
      return;
    }

    // Extend or grant 1 month of Pro — stack on top of existing expiry if already Pro
    const baseMs =
      referrer.subscriptionExpiresAt && referrer.subscriptionExpiresAt > new Date()
        ? referrer.subscriptionExpiresAt.getTime()
        : Date.now();
    const newExpiry = new Date(baseMs + THIRTY_DAYS_MS);

    await db
      .update(users)
      .set({
        subscriptionStatus: "pro",
        subscriptionExpiresAt: newExpiry,
        updatedAt: new Date(),
      })
      .where(eq(users.id, referrer.id));

    await db
      .update(referrals)
      .set({ status: "credited", creditedAt: new Date() })
      .where(eq(referrals.id, pendingReferral.id));

    logger.info(
      {
        referralId: pendingReferral.id,
        referrerId: referrer.id,
        referrerClerkId: referrer.clerkUserId,
        refereeClerkId,
        newExpiry,
      },
      "Referral credited — referrer granted 1 month Pro",
    );
  } catch (err) {
    // Never let referral crediting fail the webhook response
    logger.error({ err, refereeDbId }, "Failed to credit referrer");
  }
}

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
      // Auth check — fail-closed: require secret in production, warn in development
      if (!WEBHOOK_SECRET) {
        if (process.env.NODE_ENV !== "development") {
          logger.error("REVENUECAT_WEBHOOK_SECRET is not set — rejecting webhook (fail-closed)");
          res.status(503).json({ error: "Webhook not configured" });
          return;
        }
        logger.warn("REVENUECAT_WEBHOOK_SECRET not set — skipping auth check (development only)");
      } else {
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

      // Resolve user by app_user_id first, then fall back to known aliases
      let user = await db.query.users.findFirst({
        where: eq(users.clerkUserId, clerkUserId),
      });

      if (!user && event.aliases && event.aliases.length > 0) {
        for (const alias of event.aliases) {
          user = await db.query.users.findFirst({
            where: eq(users.clerkUserId, alias),
          });
          if (user) {
            logger.info({ clerkUserId, alias, userId: user.id }, "Resolved user via alias");
            break;
          }
        }
      }

      if (!user) {
        // User not found — not yet synced or fully anonymous; ack and move on
        logger.warn({ clerkUserId }, "RevenueCat webhook: user not found (including aliases)");
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

          // On a first-ever purchase, check if this user was referred and credit the referrer
          if (event.type === "INITIAL_PURCHASE") {
            await creditReferrerIfApplicable(user.id, clerkUserId);
          }
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
