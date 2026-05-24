import { Request } from "express";
import { db } from "@workspace/db";
import { plans, steps, users } from "@workspace/db";
import { eq } from "drizzle-orm";

export type Plan = typeof plans.$inferSelect;
export type Step = typeof steps.$inferSelect;

/**
 * Resolve the database user ID for the authenticated Clerk user.
 * Returns null if not authenticated or user not yet synced.
 */
export async function resolveUserId(clerkUserId: string | null): Promise<number | null> {
  if (!clerkUserId) return null;
  const user = await db.query.users.findFirst({
    where: eq(users.clerkUserId, clerkUserId),
  });
  return user?.id ?? null;
}

/**
 * Determine whether the requesting identity (authenticated user or guest)
 * is allowed to access or modify the given plan.
 */
export function canAccessPlan(
  plan: Plan,
  userId: number | null,
  guestSessionId: string | undefined
): boolean {
  if (userId !== null) {
    // Authenticated user: must own the plan
    return plan.userId === userId;
  }
  // Guest: must match the server-assigned guest session
  if (guestSessionId && plan.guestSessionId !== null) {
    return plan.guestSessionId === guestSessionId;
  }
  return false;
}

/**
 * Look up a plan and verify the requester owns it.
 * Returns { plan } on success, or sends an HTTP error response and returns null.
 */
export async function requirePlanAccess(
  req: Request,
  res: { status: (n: number) => { json: (b: object) => void } },
  planId: number
): Promise<Plan | null> {
  const plan = await db.query.plans.findFirst({
    where: eq(plans.id, planId),
  });

  if (!plan) {
    res.status(404).json({ error: "Plan not found" });
    return null;
  }

  const clerkUserId = req.clerkUserId ?? null;
  const userId = await resolveUserId(clerkUserId);
  const guestSessionId = req.guestSessionId;

  if (!canAccessPlan(plan, userId, guestSessionId)) {
    res.status(403).json({ error: "Not authorized to access this plan" });
    return null;
  }

  return plan;
}

/**
 * Look up a step and verify the requester owns the parent plan.
 * Returns { step, plan } on success, or sends an HTTP error response.
 */
export async function requireStepAccess(
  req: Request,
  res: { status: (n: number) => { json: (b: object) => void } },
  stepId: number
): Promise<{ step: Step; plan: Plan } | null> {
  const step = await db.query.steps.findFirst({
    where: eq(steps.id, stepId),
  });

  if (!step) {
    res.status(404).json({ error: "Step not found" });
    return null;
  }

  const plan = await requirePlanAccess(req, res, step.planId);
  if (!plan) return null;

  return { step, plan };
}
