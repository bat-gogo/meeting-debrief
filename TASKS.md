# Build Tasks

Derived from `PLAN.md`. Tick as completed. Workshop minimum: 8 tasks; ≥6 completed by the end.

## Phase 1 — Scaffold + deploy

- [ ] Run `pnpm create next-app@latest` with TS + Tailwind + ESLint + App Router + src dir, and verify `pnpm dev` boots the placeholder
- [ ] Run `pnpm dlx shadcn@latest init` and add components: `button input textarea card checkbox dialog sonner skeleton label badge accordion`
- [ ] Install runtime deps (`@supabase/ssr @supabase/supabase-js @anthropic-ai/sdk zod`), wire Prettier + Tailwind plugin, add `format` and `lint` scripts
- [ ] Push to GitHub, import into Vercel, configure env var placeholders, and verify the first auto-deploy returns 200 on the public URL

## Phase 2 — Supabase + schema

- [ ] Create the Supabase project and capture URL + anon key into `.env.local` and Vercel
- [ ] Paste the full schema SQL (tables + indexes + RLS policies + trigger + `meetings_with_stats` view with `security_invoker = true`) into the Supabase SQL editor and verify zero errors
- [ ] Disable email confirmation in Supabase Dashboard → Authentication → Providers → Email
- [ ] Generate TypeScript types via `supabase gen types typescript` into `src/lib/database.types.ts`
- [ ] Verify RLS isolation by inserting a meeting as user A and confirming a simulated user-B query returns zero rows

## Phase 3 — Auth

- [ ] Wire `@supabase/ssr` server/client/middleware modules and add `src/middleware.ts` that refreshes cookies and redirects unauthenticated requests
- [ ] Build `/login` and `/signup` pages with server actions; surface `supabase.auth.signUp` errors directly (no silent "check your email")
- [ ] Verify on the deployed URL: signup → auto sign-in → refresh → sign out → redirected to `/login`

## Phase 4 — Debrief flow

- [ ] Implement `debriefTranscript(text)` calling `claude-sonnet-4-6` with `tool_choice: { type: 'any' }` over the `record_debrief` and `reject_input` tools, returning a discriminated union
- [ ] Build `new-meeting-form.tsx` with input → AI loading skeleton → review/edit form states; preserve textarea contents on rejection or error
- [ ] Implement `saveMeeting` server action: insert meeting + batch-insert action items, return new id; redirect to `/meetings/[id]`
- [ ] Verify "not a meeting" path: paste "hello world" → friendly amber rejection banner, no DB write

## Phase 5 — List + detail + checklist

- [ ] Build `/meetings` list page reading from `meetings_with_stats` (one row per meeting + open/total counts)
- [ ] Build `/meetings/[id]` detail page rendering all six structured sections (summary, participants, decisions, blockers, action items, follow-up email)
- [ ] Add `transcript-disclosure.tsx` (shadcn Accordion, collapsed by default) on the detail page exposing the full `raw_transcript`
- [ ] Implement `action-item-row.tsx` with `useOptimistic` toggle calling `toggleActionItem`; verify checkbox state persists across page refresh
- [ ] Implement add-action-item input on detail page, copy-email button, and delete-meeting confirmation dialog

## Phase 6 — Dashboard

- [ ] Build dashboard at `/` that lists open action items across all meetings (oldest first), with each item linking back to its meeting
- [ ] Verify ticking an item on the dashboard removes it from the dashboard and marks it done on the meeting detail

## Phase 7 — Search + polish + mobile

- [ ] Add tsvector-backed search input to `/meetings` (URL-bound `?q=`); fall back to `ILIKE` only if behind schedule
- [ ] Add designed empty states to dashboard, meetings list, and search-no-results
- [ ] QA mobile layout at 375px on dashboard, new-meeting, and detail screens
- [ ] Add `src/app/error.tsx` global error boundary and mount `<Toaster />` once in the app layout

## Phase 8 — Submission

- [ ] Run two-account privacy test on the deployed URL: confirm user B cannot see user A's meeting via direct URL
- [ ] Write `README.md` (live URL, stack, local setup, schema summary, email-confirmation tradeoff note, rejection paragraph, ≤200-word reflection)
- [ ] Record the 2-minute demo video covering signup → debrief → save → tick → dashboard → search → delete
- [ ] Save `process/01-initial-plan.png`, `process/03-refined-plan.png`, `process/final-tasks.png` and link them from the submission doc

## Cut candidates if behind schedule

Tick to indicate the cut was applied (not that the feature was built):

- [ ] Swapped tsvector search for `ILIKE` (saves ~10 min)
- [ ] Skipped manual add-action-item on detail page (saves ~10 min)
- [ ] Replaced delete-confirm Dialog with browser `confirm()` (saves ~5 min)
