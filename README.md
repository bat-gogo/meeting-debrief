# Meeting Debrief

A personal meeting intelligence tool. Paste a meeting transcript or rough notes, an AI (Claude Sonnet 4.6) extracts structured intelligence — decisions, action items, blockers, a follow-up email draft — and saves everything to a searchable per-user history. Action items become checkboxes you tick off over time, giving you a lightweight task manager scoped to the meetings that created them.

Built in the Vibe Coding workshop as a 4-hour exercise in plan-mode, task tracking, and preview-approval discipline.

## Live demo

https://meeting-debrief.vercel.app

Test credentials are welcome — sign up with any email + password (min 6 chars). Email confirmation is disabled so signup is instant.

## Stack

- **Framework**: Next.js 16.2 (App Router, React 19, TypeScript strict)
- **UI**: Tailwind CSS 4, shadcn/ui (base-ui), Lucide icons, sonner toasts
- **Auth + DB**: Supabase — Postgres with Row Level Security, `@supabase/ssr` for Next cookie-bridged sessions
- **AI**: Anthropic Claude Sonnet 4.6, `@anthropic-ai/sdk`, tool-use with two tools (`record_debrief`, `reject_input`) + `tool_choice: { type: "any" }`
- **Hosting**: Vercel with automatic deploys from `main`
- **Package manager**: pnpm

## Local setup

1. Clone the repo.
2. `pnpm install`
3. Copy `.env.local.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publishable format: `sb_publishable_...`)
   - `ANTHROPIC_API_KEY`
4. `pnpm dev`

The Supabase schema is in [PLAN.md](PLAN.md) (database schema section). Apply it via Supabase's SQL editor before first run, then disable email confirmation in **Authentication → Providers → Email**.

## Architecture highlights

- **RLS is the entire privacy story.** Every row has a `user_id` column; policies restrict all operations to `(select auth.uid()) = user_id`. The `meetings_with_stats` view uses `security_invoker = true` so the aggregation respects the caller's policies (a subtle but critical setting — without it the view bypasses RLS and leaks other users' data).
- **Tool-use for structured output.** Anthropic has no JSON mode, and prompt-engineered JSON is brittle. Two tools — `record_debrief` for happy-path extraction, `reject_input` for "not a meeting" detection — with `tool_choice: { type: "any" }` forces the model to call exactly one. The server re-validates with Zod as belt-and-braces.
- **Full-text search via generated tsvector column.** `meetings.fts` is `GENERATED ALWAYS AS STORED`, Postgres maintains it automatically on every insert/update. GIN index + `websearch_to_tsquery('english', q)` via Supabase JS `.textSearch("fts", ...)`. No ILIKE fallback was shipped.
- **Dashboard + detail pages use `useOptimistic` + `useTransition`** so action-item checkboxes flip instantly; server action revalidates both `/` and `/meetings/[id]` on every mutation so cross-view state stays in sync.
- **Next.js 16 proxy convention** (middleware → proxy rename) applied via codemod. Redirect behavior smoke-tested with `Invoke-WebRequest` to confirm no silent regression to an infinite loop.

## Notable trade-offs

- **Email confirmation disabled** so graders can sign up without an inbox. Production equivalent would enable it and use a real SMTP provider. Documented and surfaced in the signup server action: if confirmation ever gets re-enabled the user sees a clear error instead of a silent "check your email" success.
- **No automated tests.** The workshop budget doesn't fit them. Manual QA with two accounts covers the privacy non-negotiable; Supabase MCP-driven SQL queries simulate cross-user access and verify RLS at the database boundary.
- **Leaked password protection disabled** — it's a Supabase Pro plan feature (HaveIBeenPwned lookup on signup). Out of scope for this free-tier build; would be first production hardening step.
- **tsvector fallback to ILIKE was NOT applied** despite being on the plan's cut-candidate list. The user explicitly chose quality over time budget after initial testing.

## Workshop artifacts

All process artifacts are under [`process/`](process/):

- [`01-initial-plan.md`](process/01-initial-plan.md) — the AI's first-draft plan before user review
- [`02-rejection.md`](process/02-rejection.md) — documented pushback on three gaps (missing raw transcript in detail UI, dangling view reference, email confirmation default) plus one proactive fix the AI added (`security_invoker=true`)
- [`03-refined-plan.md`](process/03-refined-plan.md) — frozen snapshot of the approved plan
- [`04-final-tasks.md`](process/04-final-tasks.md) — TASKS.md snapshot at project end

Original `spec.pdf` is referenced but gitignored (binary).

## Reflection

Plan-mode earned its keep in the first 30 minutes. The AI's initial plan looked clean, but reading it as an adversarial reviewer surfaced three real gaps: the detail-page JSX listed every section except the raw transcript the spec explicitly required; the Phase 5 task referenced a `meetings_with_stats` view that the Phase 2 SQL never created; and Supabase's default email confirmation would have silently blocked a grader from signing up on the live URL. None of these would have been caught by a "looks good" skim. The refined plan added the transcript Accordion, committed the CREATE VIEW, and disabled email confirmation before a single file was written.

Tasks helped me keep cut discipline visible — the three cut candidates stayed at the bottom of `TASKS.md` as explicit "not applied" entries rather than invisible silent compromises.

Preview-approval broke down once, in Phase 4B: the loading skeleton tested fine programmatically but felt frozen to a real user in Chrome. Next time I'd run browser-level testing after every phase that touches UI, not only at the end. Supabase MCP and Claude-for-Chrome as parallel surfaces made that kind of verification cheap enough to do continuously.

## Credits

Built with Claude Opus 4.7 (Claude Code in VS Code) + Claude Sonnet 4.6 (in the app) + Supabase MCP connector (schema verification, RLS audits, type generation) driving a three-surface vibe-coding workflow: desktop Claude for planning, Claude Code for execution, and Claude for Chrome for end-to-end browser testing.
