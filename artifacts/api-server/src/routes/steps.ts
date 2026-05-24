import { Router, type IRouter, type Request, type NextFunction } from "express";
import { db } from "@workspace/db";
import { steps } from "@workspace/db";
import { UpdateStepParams, UpdateStepBody, ExpandStepParams } from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";
import { eq, asc } from "drizzle-orm";
import { requireStepAccess } from "../lib/planAccess";

const router: IRouter = Router();

interface StepData {
  text: string;
}

router.patch("/steps/:id", async (req: Request, res, next: NextFunction) => {
  try {
    const paramsResult = UpdateStepParams.safeParse({ id: Number(req.params.id) });
    const bodyResult = UpdateStepBody.safeParse(req.body);

    if (!paramsResult.success || !bodyResult.success) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }

    const result = await requireStepAccess(req, res, paramsResult.data.id);
    if (!result) return;

    const [updated] = await db
      .update(steps)
      .set({ text: bodyResult.data.text, updatedAt: new Date() })
      .where(eq(steps.id, result.step.id))
      .returning();

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.post("/steps/:id/expand", async (req: Request, res, next: NextFunction) => {
  try {
    const paramsResult = ExpandStepParams.safeParse({ id: Number(req.params.id) });

    if (!paramsResult.success) {
      res.status(400).json({ error: "Invalid step ID" });
      return;
    }

    const result = await requireStepAccess(req, res, paramsResult.data.id);
    if (!result) return;

    const { step, plan } = result;
    const goalContext = plan.goal;

    const existingChildren = await db.query.steps.findMany({
      where: eq(steps.parentStepId, step.id),
      orderBy: [asc(steps.sortOrder)],
    });

    if (existingChildren.length > 0) {
      const [updatedStep] = await db
        .update(steps)
        .set({ isExpanded: true, updatedAt: new Date() })
        .where(eq(steps.id, step.id))
        .returning();

      res.json({ ...updatedStep, children: existingChildren });
      return;
    }

    const prompt = `You are a goal achievement expert. Break down the following step into smaller, more specific sub-steps.

Overall goal: "${goalContext}"
Step to break down: "${step.text}"

Return a JSON object with this exact structure:
{
  "steps": [
    {
      "text": "Sub-step description (specific and actionable, 1-2 sentences)"
    }
  ]
}

Requirements:
- Provide 3-6 sub-steps
- Each sub-step should be more specific than the parent step
- Sub-steps should be in logical order
- Return ONLY the JSON object, no markdown, no explanation`;

    const response = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    let parsed: { steps: StepData[] };
    try {
      parsed = JSON.parse(content) as { steps: StepData[] };
    } catch {
      res.status(500).json({ error: "Failed to parse AI response" });
      return;
    }

    if (!Array.isArray(parsed.steps)) {
      res.status(500).json({ error: "Invalid AI response structure" });
      return;
    }

    const insertedChildren = await Promise.all(
      parsed.steps.map((s, i) =>
        db
          .insert(steps)
          .values({
            planId: step.planId,
            parentStepId: step.id,
            text: s.text,
            sortOrder: i,
            depth: step.depth + 1,
            isExpanded: false,
          })
          .returning()
          .then(([row]) => row)
      )
    );

    const [updatedStep] = await db
      .update(steps)
      .set({ isExpanded: true, updatedAt: new Date() })
      .where(eq(steps.id, step.id))
      .returning();

    res.json({ ...updatedStep, children: insertedChildren });
  } catch (err) {
    next(err);
  }
});

export default router;
