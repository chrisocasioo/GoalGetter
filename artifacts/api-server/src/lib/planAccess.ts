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
 * Determine whether the requesting identity can READ the given plan.
 * Authenticated users must own the plan (by userId).
 * Guests may read their own just-generated plan (by guestSessionId).
 */
export function canReadPlan(
  plan: Plan,
  userId: number | null,
  guestSessionId: string | undefined
): boolean {
  if (userId !== null) {
    return plan.userId === userId;
  }
  if (guestSessionId && plan.guestSessionId !== null) {
    return plan.guestSessionId === guestSessionId;
  }
  return false;
}

/**
 * Determine whether the requesting identity can WRITE to the given plan.
 * Guests are never allowed to mutate plans — account creation is required.
 */
export function canWritePlan(plan: Plan, userId: number | null): boolean {
  if (userId === null) return false;
  return plan.userId === userId;
}

type ResLike = { status: (n: number) => { json: (b: object) => void } };

/**
 * Look up a plan and verify the requester can READ it.
 * Guests may access their own freshly generated plans.
 */
export async function requirePlanReadAccess(
  req: Request,
  res: ResLike,
  planId: number
): Promise<Plan | null> {
  const plan = await db.query.plans.findFirst({ where: eq(plans.id, planId) });

  if (!plan) {
    res.status(404).json({ error: "Plan not found" });
    return null;
  }

  const userId = await resolveUserId(req.clerkUserId ?? null);

  if (!canReadPlan(plan, userId, req.guestSessionId)) {
    res.status(403).json({ error: "Not authorized to access this plan" });
    return null;
  }

  return plan;
}

/**
 * Look up a plan and verify the requester can WRITE to it.
 * Requires authentication — guests always receive 401.
 */
export async function requirePlanWriteAccess(
  req: Request,
  res: ResLike,
  planId: number
): Promise<Plan | null> {
  if (!req.clerkUserId) {
    res.status(401).json({ error: "Authentication required" });
    return null;
  }

  const plan = await db.query.plans.findFirst({ where: eq(plans.id, planId) });

  if (!plan) {
    res.status(404).json({ error: "Plan not found" });
    return null;
  }

  const userId = await resolveUserId(req.clerkUserId);

  if (!canWritePlan(plan, userId)) {
    res.status(403).json({ error: "Not authorized to modify this plan" });
    return null;
  }

  return plan;
}

/**
 * Look up a step and verify the requester can READ the parent plan.
 */
export async function requireStepReadAccess(
  req: Request,
  res: ResLike,
  stepId: number
): Promise<{ step: Step; plan: Plan } | null> {
  const step = await db.query.steps.findFirst({ where: eq(steps.id, stepId) });

  if (!step) {
    res.status(404).json({ error: "Step not found" });
    return null;
  }

  const plan = await requirePlanReadAccess(req, res, step.planId);
  if (!plan) return null;

  return { step, plan };
}

/**
 * Look up a step and verify the requester can WRITE to the parent plan.
 * Requires authentication.
 */
export async function requireStepWriteAccess(
  req: Request,
  res: ResLike,
  stepId: number
): Promise<{ step: Step; plan: Plan } | null> {
  const step = await db.query.steps.findFirst({ where: eq(steps.id, stepId) });

  if (!step) {
    res.status(404).json({ error: "Step not found" });
    return null;
  }

  const plan = await requirePlanWriteAccess(req, res, step.planId);
  if (!plan) return null;

  return { step, plan };
}

// Legacy export — keep read semantics for backward compat
export const requirePlanAccess = requirePlanReadAccess;
export const requireStepAccess = requireStepReadAccess;
