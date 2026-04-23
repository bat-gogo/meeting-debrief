# Final Task List (snapshot at project end)

> This is a frozen snapshot of `TASKS.md` at submission time. The live
> `TASKS.md` at the repo root contains the same content.

---

# Build Tasks

Derived from `PLAN.md`. Tick as completed. Workshop minimum: 8 tasks; ≥6 completed by the end.

## Phase 1 — Scaffold + deploy

- [x] Run `pnpm create next-app@latest` with TS + Tailwind + ESLint + App Router + src dir, and verify `pnpm dev` boots the placeholder *(verified via `pnpm build` instead of `dev`, per session instructions)*
- [x] Run `pnpm dlx shadcn@latest init` and add components: `button input textarea card checkbox dialog sonner skeleton label badge accordion`
- [x] Install runtime deps (`@supabase/ssr @supabase/supabase-js @anthropic-ai/sdk zod`)
- [x] Wire Prettier + `prettier-plugin-tailwindcss`, add `format` and `lint` scripts
- [ ] Push to GitHub, import into Vercel, configure env var placeholders, and verify the first auto-deploy returns 200 on the public URL

## Phase 2 — Supabase + schema

- [x] Create the Supabase project and capture URL + anon key into `.env.local` and Vercel
- [x] Paste the full schema SQL (tables + indexes + RLS policies + trigger + `meetings_with_stats` view with `security_invoker = true`) into the Supabase SQL editor and verify zero errors
- [x] Disable email confirmation in Supabase Dashboard → Authentication → Providers → Email
- [x] Generate TypeScript types via `supabase gen types typescript` into `src/lib/database.types.ts`
- [ ] Verify RLS isolation by inserting a meeting as user A and confirming a simulated user-B query returns zero rows *(deferred until Phase 3 auth lets us sign up real users)*

## Phase 3 — Auth

- [x] Wire `@supabase/ssr` server/client/middleware modules and add `src/proxy.ts` that refreshes cookies and redirects unauthenticated requests
- [x] Build `/login` and `/signup` pages with server actions; surface `supabase.auth.signUp` errors directly (no silent "check your email")
- [ ] Verify on the deployed URL: signup → auto sign-in → refresh → sign out → redirected to `/login`

## Phase 4 — Debrief flow

- [x] Implement `debriefTranscript(text)` calling `claude-sonnet-4-6` with `tool_choice: { type: 'any' }` over the `record_debrief` and `reject_input` tools, returning a discriminated union
- [x] Build `new-meeting-form.tsx` with input → AI loading skeleton → review/edit form states; preserve textarea contents on rejection or error
- [x] Implement `saveMeeting` server action: insert meeting + batch-insert action items, return new id; redirect to `/meetings/[id]`
- [x] Verify "not a meeting" path: paste "hello world" → friendly amber rejection banner, no DB write *(backend path verified in Phase 4A test-debrief.ts; UI path awaits interactive test)*

## Phase 5 — List + detail + checklist

- [x] Build `/meetings` list page reading from `meetings_with_stats` (one row per meeting + open/total counts)
- [x] Build `/meetings/[id]` detail page rendering all six structured sections (summary, participants, decisions, blockers, action items, follow-up email)
- [x] Add transcript disclosure (shadcn Accordion, collapsed by default) on the detail page exposing the full `raw_transcript` *(inlined into detail page rather than a separate component)*
- [x] Implement `action-item-row.tsx` with `useOptimistic` toggle calling `toggleActionItem`; verify checkbox state persists across page refresh *(persistence awaits interactive test)*
- [x] Implement add-action-item input on detail page, copy-email button, and delete-meeting confirmation dialog

## Phase 6 — Dashboard

- [x] Build dashboard at `/` that lists open action items across all meetings (oldest first), with each item linking back to its meeting
- [x] Verify ticking an item on the dashboard removes it from the dashboard and marks it done on the meeting detail *(revalidation wired in Phase 5 `toggleActionItem`; interactive confirmation awaits browser test)*

## Phase 7 — Search + polish + mobile

- [x] Add tsvector-backed search input to `/meetings` (URL-bound `?q=`); generated `meetings.fts` column + websearch_to_tsquery
- [x] Add designed empty states to dashboard, meetings list, and search-no-results *(reusable `EmptyState` component)*
- [x] QA mobile layout at 375px on dashboard, new-meeting, and detail screens *(one fix: nav stacks brand above nav-items at <sm to prevent 375px overflow)*
- [x] Add `src/app/error.tsx` global error boundary and mount `<Toaster />` once in the app layout *(Toaster mounted in Phase 4B)*

## Phase 8 — Submission

- [ ] Run two-account privacy test on the deployed URL: confirm user B cannot see user A's meeting via direct URL
- [ ] Write `README.md` (live URL, stack, local setup, schema summary, email-confirmation tradeoff note, rejection paragraph, ≤200-word reflection)
- [ ] Record the 2-minute demo video covering signup → debrief → save → tick → dashboard → search → delete
- [ ] Save `process/01-initial-plan.png`, `process/03-refined-plan.png`, `process/final-tasks.png` and link them from the submission doc

## Cut candidates if behind schedule

Tick to indicate the cut was applied (not that the feature was built):

- [ ] Swapped tsvector search for `ILIKE` — **CUT NOT APPLIED**. Implemented proper `tsvector` search: generated `meetings.fts` column (`GENERATED ALWAYS AS STORED`), column GIN index, `websearch_to_tsquery('english', q)` via Supabase JS `.textSearch("fts", q, { type: "websearch", config: "english" })`. Chose quality over time budget.
- [ ] Skipped manual add-action-item on detail page (saves ~10 min) — **CUT NOT APPLIED**, shipped on detail page.
- [ ] Replaced delete-confirm Dialog with browser `confirm()` (saves ~5 min) — **CUT NOT APPLIED**, shipped with shadcn `Dialog`.

## Known advisor warnings (documented, not fixed)

- Supabase advisor surfaces **`leaked_password_protection`** — Pro-plan feature that checks signup/reset passwords against HaveIBeenPwned. Out of scope for this free-tier demo build.
