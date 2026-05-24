import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { plans, steps, users } from "@workspace/db";
import {
  GetPlanParams,
  DeletePlanParams,
  ReorderStepsParams,
  ReorderStepsBody,
} from "@workspace/api-zod";
import { eq, and, isNull, asc } from "drizzle-orm";

const router: IRouter = Router();

function buildStepTree(
  allSteps: (typeof steps.$inferSelect)[],
  parentId: number | null = null
): ((typeof steps.$inferSelect) & { children: unknown[] })[] {
  return allSteps
    .filter((s) => s.parentStepId === parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((s) => ({
      ...s,
      children: buildStepTree(allSteps, s.id),
    }));
}

async function resolveUserId(clerkUserId: string | null): Promise<number | null> {
  if (!clerkUserId) return null;
  const user = await db.query.users.findFirst({
    where: eq(users.clerkUserId, clerkUserId),
  });
  return user?.id ?? null;
}

router.get("/plans", async (req, res) => {
  const clerkUserId = (req as { clerkUserId?: string }).clerkUserId ?? null;
  if (!clerkUserId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  const userId = await resolveUserId(clerkUserId);
  if (!userId) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  const userPlans = await db.query.plans.findMany({
    where: eq(plans.userId, userId),
    orderBy: (p, { desc }) => [desc(p.createdAt)],
  });

  res.json(userPlans);
});

router.get("/plans/:id", async (req, res) => {
  const paramsResult = GetPlanParams.safeParse({ id: Number(req.params.id) });
  if (!paramsResult.success) {
    res.status(400).json({ error: "Invalid plan ID" });
    return;
  }

  const plan = await db.query.plans.findFirst({
    where: eq(plans.id, paramsResult.data.id),
  });

  if (!plan) {
    res.status(404).json({ error: "Plan not found" });
    return;
  }

  const allSteps = await db.query.steps.findMany({
    where: eq(steps.planId, plan.id),
    orderBy: [asc(steps.sortOrder)],
  });

  res.json({
    ...plan,
    steps: buildStepTree(allSteps),
  });
});

router.delete("/plans/:id", async (req, res) => {
  const paramsResult = DeletePlanParams.safeParse({ id: Number(req.params.id) });
  if (!paramsResult.success) {
    res.status(400).json({ error: "Invalid plan ID" });
    return;
  }

  const plan = await db.query.plans.findFirst({
    where: eq(plans.id, paramsResult.data.id),
  });

  if (!plan) {
    res.status(404).json({ error: "Plan not found" });
    return;
  }

  const clerkUserId = (req as { clerkUserId?: string }).clerkUserId ?? null;
  if (!clerkUserId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const userId = await resolveUserId(clerkUserId);
  if (!userId || plan.userId !== userId) {
    res.status(403).json({ error: "Not authorized to delete this plan" });
    return;
  }

  await db.delete(plans).where(eq(plans.id, plan.id));
  res.status(204).send();
});

router.patch("/plans/:id/reorder", async (req, res) => {
  const paramsResult = ReorderStepsParams.safeParse({ id: Number(req.params.id) });
  const bodyResult = ReorderStepsBody.safeParse(req.body);

  if (!paramsResult.success || !bodyResult.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const plan = await db.query.plans.findFirst({
    where: eq(plans.id, paramsResult.data.id),
  });

  if (!plan) {
    res.status(404).json({ error: "Plan not found" });
    return;
  }

  const { stepOrders } = bodyResult.data;

  await Promise.all(
    stepOrders.map(({ id, sortOrder }) =>
      db
        .update(steps)
        .set({ sortOrder, updatedAt: new Date() })
        .where(and(eq(steps.id, id), eq(steps.planId, plan.id)))
    )
  );

  const allSteps = await db.query.steps.findMany({
    where: eq(steps.planId, plan.id),
    orderBy: [asc(steps.sortOrder)],
  });

  res.json({
    ...plan,
    steps: buildStepTree(allSteps),
  });
});

export default router;
