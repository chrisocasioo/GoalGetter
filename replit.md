# GoalGetter

A focused, practical goal-planning app for iOS and Android. Users type in any goal and get an AI-generated step-by-step plan. They can drill down into any step for more detail, reorganize steps, and save plans to their account.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string (auto-provisioned)
- Required env: `AI_INTEGRATIONS_OPENAI_BASE_URL`, `AI_INTEGRATIONS_OPENAI_API_KEY` — auto-set via Replit AI Integrations

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- AI: OpenAI via Replit AI Integrations (`@workspace/integrations-openai-ai-server`)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — single source of truth for all API contracts
- `lib/db/src/schema/` — Drizzle ORM table definitions (users, plans, steps, usage, referrals)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/api-server/src/middlewares/auth.ts` — optional Clerk JWT extraction
- `lib/api-client-react/src/generated/` — auto-generated React Query hooks (do not edit)
- `lib/api-zod/src/generated/` — auto-generated Zod validators (do not edit)
- `.local/tasks/constitution.md` — project constitution and build guidelines

## Architecture decisions

- All AI calls go through the backend (`/api/goals`, `/api/steps/:id/expand`) — API keys never exposed to clients
- Usage tracking is server-side only — guest sessions tracked by `guestSessionId` string, authenticated users by `userId`
- Free tier limit is 3 plans lifetime (not per month) — enforced in `goals.ts` route
- Auth is optional on most routes — `optionalAuth` middleware extracts Clerk user ID from `Authorization: Bearer <token>` header if present
- In-app purchases must use Apple/Google IAP via RevenueCat (not Stripe) — required for App Store compliance
- Referral codes are 8-char uppercase hex, generated at user creation and stored in DB

## Product

- Landing screen with "What is your goal?" search-style input
- AI generates a structured, actionable plan with 4-8 steps
- Any step can be expanded into sub-steps (infinite depth)
- Steps can be edited inline and reordered
- Free tier: 3 plans (guest or account); Pro: unlimited plans, themes, app icons
- $0.99/month or $9.99/year via in-app purchase
- Referral system: invite a friend who subscribes → 1 free month of Pro

## User preferences

- App name: GoalGetter
- Target audience: General adults (personal and professional goals)
- Feel: Focused and practical (not motivational/cheesy)
- No emojis in UI
- Referral system included from the start (not deferred)
- Constitution and build guidelines: `.local/tasks/constitution.md`

## Gotchas

- Always run `pnpm --filter @workspace/api-spec run codegen` after editing `openapi.yaml`
- Do NOT import from `zod/v4` directly in Express route files — esbuild can't resolve it. Use validators from `@workspace/api-zod` only
- Do NOT modify generated files in `lib/api-client-react/src/generated/` or `lib/api-zod/src/generated/`
- Subscriptions MUST use RevenueCat + Apple/Google IAP — Stripe cannot be used for in-app digital subscriptions
- Account deletion must be available from within the app (Apple requirement)
- The `integrations-openai-ai-react` package is NOT in root tsconfig until a frontend artifact exists

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See `.local/tasks/constitution.md` for full project constitution and build guidelines
