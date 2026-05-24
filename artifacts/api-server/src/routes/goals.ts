import { Router, type IRouter, type Request, type NextFunction } from "express";
import { db } from "@workspace/db";
import { plans, steps, usageTracking, users } from "@workspace/db";
import { GeneratePlanBody } from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

const FREE_PLAN_LIMIT = 3;

interface StepData {
  text: string;
  steps?: StepData[];
}

interface PlanData {
  title: string;
  steps: StepData[];
}

async function getOrCreateUsageRecord(
  userId: number | null,
  guestSessionId: string | null
) {
  if (userId !== null) {
    const existing = await db.query.usageTracking.findFirst({
      where: eq(usageTracking.userId, userId),
    });
    if (existing) return existing;
    const [created] = await db
      .insert(usageTracking)
      .values({ userId, planCount: 0 })
      .returning();
    return created;
  }
  if (guestSessionId) {
    const existing = await db.query.usageTracking.findFirst({
      where: eq(usageTracking.guestSessionId, guestSessionId),
    });
    if (existing) return existing;
    const [created] = await db
      .insert(usageTracking)
      .values({ guestSessionId, planCount: 0 })
      .returning();
    return created;
  }
  return null;
}

async function insertStepsRecursive(
  planId: number,
  stepsData: StepData[],
  parentStepId: number | null,
  depth: number
) {
  const inserted: (typeof steps.$inferSelect & { children: unknown[] })[] = [];
  for (let i = 0; i < stepsData.length; i++) {
    const stepData = stepsData[i];
    const [step] = await db
      .insert(steps)
      .values({
        planId,
        parentStepId,
        text: stepData.text,
        sortOrder: i,
        depth,
        isExpanded: false,
      })
      .returning();
    const children =
      stepData.steps && stepData.steps.length > 0
        ? await insertStepsRecursive(planId, stepData.steps, step.id, depth + 1)
        : [];
    inserted.push({ ...step, children });
  }
  return inserted;
}

router.post("/goals", async (req: Request, res, next: NextFunction) => {
  try {
    const parseResult = GeneratePlanBody.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: "Invalid request body" });
      return;
    }

    const { goal } = parseResult.data;

    // Resolve identity — fail closed if neither auth nor guest session is present
    const clerkUserId = req.clerkUserId ?? null;
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

    // For guests, use the server-assigned session ID only
    const effectiveGuestId = userId === null ? (req.guestSessionId ?? null) : null;

    if (!isPro) {
      // Fail-closed: if we have no identity at all, deny generation
      if (userId === null && !effectiveGuestId) {
        res.status(400).json({
          error: "No session identity found. Please retry — a guest session will be assigned.",
          code: "NO_IDENTITY",
        });
        return;
      }

      const usage = await getOrCreateUsageRecord(userId, effectiveGuestId);
      if (usage && usage.planCount >= FREE_PLAN_LIMIT) {
        res.status(429).json({
          error: "Free plan limit reached. Upgrade to GoalGetter Pro for unlimited plans.",
          code: "PLAN_LIMIT_REACHED",
        });
        return;
      }
    }

    const prompt = `You are a goal achievement expert. Break down the following goal into clear, actionable steps.

Goal: "${goal}"

Return a JSON object with this exact structure:
{
  "title": "Short title for this goal plan (max 60 chars)",
  "steps": [
    {
      "text": "Step description (clear and actionable, 1-2 sentences)"
    }
  ]
}

Requirements:
- Provide 4-8 top-level steps
- Each step should be specific and actionable
- Steps should be in logical order
- Do not nest steps — return flat top-level steps only
- Return ONLY the JSON object, no markdown, no explanation`;

    const response = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    let planData: PlanData;
    try {
      planData = JSON.parse(content) as PlanData;
    } catch {
      res.status(500).json({ error: "Failed to parse AI response" });
      return;
    }

    if (!planData.title || !Array.isArray(planData.steps)) {
      res.status(500).json({ error: "Invalid AI response structure" });
      return;
    }

    const [plan] = await db
      .insert(plans)
      .values({
        userId,
        guestSessionId: effectiveGuestId,
        title: planData.title,
        goal,
      })
      .returning();

    const insertedSteps = await insertStepsRecursive(plan.id, planData.steps, null, 0);

    if (!isPro) {
      const usage = await getOrCreateUsageRecord(userId, effectiveGuestId);
      if (usage) {
        await db
          .update(usageTracking)
          .set({ planCount: usage.planCount + 1, updatedAt: new Date() })
          .where(eq(usageTracking.id, usage.id));
      }
    }

    res.json({ ...plan, steps: insertedSteps });
  } catch (err) {
    next(err);
  }
});

export default router;
