import { Router, type IRouter, type Request, type NextFunction } from "express";
import { db } from "@workspace/db";
import { plans, steps } from "@workspace/db";
import {
  GetPlanParams,
  DeletePlanParams,
  ReorderStepsParams,
  ReorderStepsBody,
} from "@workspace/api-zod";
import { eq, and, asc } from "drizzle-orm";
import {
  requirePlanReadAccess,
  requirePlanWriteAccess,
  resolveUserId,
} from "../lib/planAccess";
import { requireAuth } from "../middlewares/auth";

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

// GET /plans — list authenticated user's plans (auth required)
router.get("/plans", requireAuth, async (req: Request, res, next: NextFunction) => {
  try {
    const userId = await resolveUserId(req.clerkUserId!);
    if (!userId) {
      res.status(401).json({ error: "User not found. Call /users/sync first." });
      return;
    }

    const userPlans = await db.query.plans.findMany({
      where: eq(plans.userId, userId),
      orderBy: (p, { desc }) => [desc(p.createdAt)],
    });

    res.json(userPlans);
  } catch (err) {
    next(err);
  }
});

// GET /plans/:id — guests may read their own just-generated plan; auth users own plans only
router.get("/plans/:id", async (req: Request, res, next: NextFunction) => {
  try {
    const paramsResult = GetPlanParams.safeParse({ id: Number(req.params.id) });
    if (!paramsResult.success) {
      res.status(400).json({ error: "Invalid plan ID" });
      return;
    }

    const plan = await requirePlanReadAccess(req, res, paramsResult.data.id);
    if (!plan) return;

    const allSteps = await db.query.steps.findMany({
      where: eq(steps.planId, plan.id),
      orderBy: [asc(steps.sortOrder)],
    });

    res.json({ ...plan, steps: buildStepTree(allSteps) });
  } catch (err) {
    next(err);
  }
});

// DELETE /plans/:id — auth required; guests cannot delete
router.delete("/plans/:id", requireAuth, async (req: Request, res, next: NextFunction) => {
  try {
    const paramsResult = DeletePlanParams.safeParse({ id: Number(req.params.id) });
    if (!paramsResult.success) {
      res.status(400).json({ error: "Invalid plan ID" });
      return;
    }

    const plan = await requirePlanWriteAccess(req, res, paramsResult.data.id);
    if (!plan) return;

    await db.delete(plans).where(eq(plans.id, plan.id));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// PATCH /plans/:id/reorder — auth required; guests cannot reorder
router.patch("/plans/:id/reorder", requireAuth, async (req: Request, res, next: NextFunction) => {
  try {
    const paramsResult = ReorderStepsParams.safeParse({ id: Number(req.params.id) });
    const bodyResult = ReorderStepsBody.safeParse(req.body);

    if (!paramsResult.success || !bodyResult.success) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }

    const plan = await requirePlanWriteAccess(req, res, paramsResult.data.id);
    if (!plan) return;

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

    res.json({ ...plan, steps: buildStepTree(allSteps) });
  } catch (err) {
    next(err);
  }
});

export default router;
