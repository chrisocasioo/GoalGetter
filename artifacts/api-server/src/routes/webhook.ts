import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { users, referrals } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { grantCustomerEntitlement, listEntitlements } from "@replit/revenuecat-sdk";
import { logger } from "../lib/logger";
import { getRevenueCatClient } from "../lib/revenueCatClient";

const router: IRouter = Router();

const WEBHOOK_SECRET = process.env.REVENUECAT_WEBHOOK_SECRET;
const RC_PROJECT_ID = process.env.REVENUECAT_PROJECT_ID ?? "";
const RC_ENTITLEMENT = "pro";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

let cachedProEntitlementId: string | null = null;

async function getProEntitlementId(): Promise<string | null> {
  if (cachedProEntitlementId) return cachedProEntitlementId;
  if (!RC_PROJECT_ID) return null;

  try {
    const client = getRevenueCatClient();
    const { data, error } = await listEntitlements({
      client,
      path: { project_id: RC_PROJECT_ID },
    });
    if (error || !data?.items) {
      logger.warn({ error }, "Could not list RC entitlements to find pro ID");
      return null;
    }
    const proEnt = data.items.find((e) => e.lookup_key === RC_ENTITLEMENT);
    if (!proEnt) {
      logger.warn({ RC_ENTITLEMENT }, "Pro entitlement not found in RC project");
      return null;
    }
    cachedProEntitlementId = proEnt.id;
    logger.info({ entitlementId: cachedProEntitlementId }, "Cached pro entitlement ID from RC");
    return cachedProEntitlementId;
  } catch (err) {
    logger.warn({ err }, "Error fetching RC entitlement list");
    return null;
  }
}

/**
 * When a referee completes their first paid purchase, credit the referrer with 1 free month of Pro.
 *
 * Flow (RC is the authority; DB mirrors RC):
 * 1. Atomically claim the referral row (pending → credited) — idempotency guard.
 *    Concurrent INITIAL_PURCHASE retries will update 0 rows and return early.
 * 2. Fresh-read the referrer's current subscription expiry POST-transaction so we
 *    compute a current (not stale) base for the RC grant call.
 * 3. Call RC's grantCustomerEntitlement API. If it fails, revert the referral back
 *    to "pending" so the next webhook re-delivery can retry.
 * 4. Only after RC confirms success: update the referrer's subscription row in DB
 *    using an atomic SQL GREATEST expression so concurrent credits from different
 *    referrals stack correctly under Postgres row-level locking.
 */
async function creditReferrerIfApplicable(refereeDbId: number, refereeClerkId: string): Promise<void> {
  try {
    const pendingReferral = await db.query.referrals.findFirst({
      where: and(eq(referrals.refereeId, refereeDbId), eq(referrals.status, "pending")),
    });
    if (!pendingReferral) return;

    const referrer = await db.query.users.findFirst({
      where: eq(users.id, pendingReferral.referrerId),
    });
    if (!referrer) {
      logger.warn({ referralId: pendingReferral.id }, "Referral referrer not found — skipping credit");
      return;
    }

    // Step 1: Atomically claim the referral row (idempotency guard only — no user update yet).
    let claimed = false;
    await db.transaction(async (tx) => {
      const claimRows = await tx
        .update(referrals)
        .set({ status: "credited", creditedAt: new Date() })
        .where(and(eq(referrals.id, pendingReferral.id), eq(referrals.status, "pending")))
        .returning({ id: referrals.id });

      if (claimRows.length === 0) return; // already claimed by a concurrent request
      claimed = true;
    });

    if (!claimed) {
      logger.info({ referralId: pendingReferral.id }, "Referral already credited by concurrent request — skipping");
      return;
    }

    // Step 2: Fresh-read referrer subscription post-transaction to minimise staleness
    // when computing the expiry to send to RC.
    const freshReferrer = await db.query.users.findFirst({
      where: eq(users.id, referrer.id),
      columns: { subscriptionExpiresAt: true },
    });
    const baseMs =
      freshReferrer?.subscriptionExpiresAt && freshReferrer.subscriptionExpiresAt > new Date()
        ? freshReferrer.subscriptionExpiresAt.getTime()
        : Date.now();
    const newExpiry = new Date(baseMs + THIRTY_DAYS_MS);

    // Step 3: Grant via RC (RC is the authority). If RC fails, revert the referral to
    // "pending" so the next webhook delivery retries instead of silently dropping it.
    let rcGranted = false;
    try {
      const proEntitlementId = await getProEntitlementId();
      if (proEntitlementId) {
        const client = getRevenueCatClient();
        const { error: grantError } = await grantCustomerEntitlement({
          client,
          path: { project_id: RC_PROJECT_ID, customer_id: referrer.clerkUserId },
          body: { entitlement_id: proEntitlementId, expires_at: newExpiry.getTime() },
        });
        if (grantError) {
          logger.warn({ grantError, referrerId: referrer.id }, "RC grant returned error");
        } else {
          rcGranted = true;
          logger.info({ referrerId: referrer.id, newExpiry }, "RC entitlement granted");
        }
      } else {
        logger.warn({ referrerId: referrer.id }, "Pro entitlement ID unavailable — cannot grant via RC");
      }
    } catch (rcErr) {
      logger.warn({ rcErr, referrerId: referrer.id }, "RC grant threw unexpectedly");
    }

    if (!rcGranted) {
      // Revert referral to pending so RC SDK delivery retries can re-attempt
      try {
        await db
          .update(referrals)
          .set({ status: "pending", creditedAt: null })
          .where(eq(referrals.id, pendingReferral.id));
        logger.info({ referralId: pendingReferral.id }, "Referral reverted to pending after RC failure — will retry on next delivery");
      } catch (revertErr) {
        logger.error({ revertErr, referralId: pendingReferral.id }, "CRITICAL: RC failed AND revert failed — referral may be stuck credited without RC grant");
      }
      return;
    }

    // Step 4: RC confirmed — mirror to DB. SQL GREATEST expression ensures two concurrent
    // credits for the same referrer (from two different referrals) stack correctly because
    // Postgres serialises updates to the same row under row-level locking.
    await db
      .update(users)
      .set({
        subscriptionStatus: "pro",
        subscriptionExpiresAt: sql`GREATEST(COALESCE(subscription_expires_at, NOW()), NOW()) + interval '30 days'`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, referrer.id));

    logger.info(
      {
        referralId: pendingReferral.id,
        referrerId: referrer.id,
        referrerClerkId: referrer.clerkUserId,
        refereeClerkId,
        newExpiry,
      },
      "Referral fully credited — referrer granted 1 free month of Pro",
    );
  } catch (err) {
    logger.error({ err, refereeDbId }, "creditReferrerIfApplicable failed — webhook still acks");
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
  period_type?: "TRIAL" | "INTRO" | "NORMAL" | "PROMOTIONAL";
  is_trial_conversion?: boolean;
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
        logger.warn({ clerkUserId }, "RevenueCat webhook: user not found (including aliases)");
        res.status(200).json({ received: true });
        return;
      }

      const expiresAt = event.expiration_at_ms ? new Date(event.expiration_at_ms) : null;

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

          // Credit referrer only on confirmed first paid conversion:
          // - INITIAL_PURCHASE where period_type is not TRIAL (or unset = legacy/paid)
          // - RENEWAL that is a trial-to-paid conversion (is_trial_conversion = true)
          {
            const isFirstPaidConversion =
              (event.type === "INITIAL_PURCHASE" && event.period_type !== "TRIAL") ||
              (event.type === "RENEWAL" && event.is_trial_conversion === true);
            if (isFirstPaidConversion) {
              await creditReferrerIfApplicable(user.id, clerkUserId);
            }
          }
          break;

        case "CANCELLATION":
          await db
            .update(users)
            .set({ subscriptionExpiresAt: expiresAt, updatedAt: new Date() })
            .where(eq(users.id, user.id));
          logger.info({ clerkUserId }, "Subscription cancelled — keeping Pro until expiry");
          break;

        case "EXPIRATION":
        case "BILLING_ISSUE":
          await db
            .update(users)
            .set({ subscriptionStatus: "free", subscriptionExpiresAt: null, updatedAt: new Date() })
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
