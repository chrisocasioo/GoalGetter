import { integer, pgTable, serial, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { plans } from "./plans";

export const steps = pgTable("steps", {
  id: serial("id").primaryKey(),
  planId: integer("plan_id")
    .notNull()
    .references(() => plans.id, { onDelete: "cascade" }),
  parentStepId: integer("parent_step_id"),
  text: text("text").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  depth: integer("depth").notNull().default(0),
  isExpanded: boolean("is_expanded").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertStepSchema = createInsertSchema(steps).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Step = typeof steps.$inferSelect;
export type InsertStep = z.infer<typeof insertStepSchema>;
