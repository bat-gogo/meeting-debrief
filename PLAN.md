# Meeting Debrief — Build Plan (Canonical Reference)

> This is the living reference document for the build. Update it as plans evolve.
> The frozen approval-time snapshot lives at `process/03-refined-plan.md`.

## Context

Meeting Debrief is a 4-hour workshop homework: a personal meeting-intelligence tool. The user pastes a transcript, an AI extracts structured output (title, summary, decisions, action items, blockers, follow-up email, participants), and the result is saved to a per-user searchable history with tickable action items and a cross-meeting dashboard of open work.

Stack is fixed: Next.js 16 App Router + TypeScript + Tailwind + shadcn/ui + Supabase (Auth + Postgres + RLS) via `@supabase/ssr` + Anthropic SDK. Vercel for deploy, GitHub for source, pnpm for deps.

This plan encodes the build order, the database schema, the AI prompting strategy, and the client/server split, with per-phase acceptance criteria and time estimates calibrated to the 4-hour budget.

The plan reflects the user's review revisions: (1) raw transcript surfaced on the detail page, (2) `meetings_with_stats` view committed into the schema, (3) Supabase email-confirmation disabled with signup-error surfacing, (4) model locked to `claude-sonnet-4-6`.

---

## Assumptions

1. **Model**: `claude-sonnet-4-6`. Fast, cheap, equally capable at tool-use on short transcripts. Opus 4.7 is overkill for single-shot structured extraction.
2. **Auth**: Supabase email + password. Password-based beats magic-link for a demo because it works without a real inbox.
3. **Single-user**: `user_id = auth.uid()`. No orgs, no sharing. RLS is the entire authorization story.
4. **Meeting date** is the date the meeting happened. AI extracts if present; otherwise defaults to today; user can edit on the review screen.
5. **Action items** live in their own table (not JSONB). Toggling is the hot path; it should be one row update and the dashboard needs a real index.
6. **Follow-up email** stored as plain text. No regeneration.
7. **Participants** stored as `text[]` on the meeting row, AI-extracted from the transcript.
8. **Search**: Postgres `tsvector` + GIN. No pgvector.
9. **UI**: shadcn/ui defaults, system font stack, no dark mode.
10. **No streaming** for AI responses. One POST, ~5–15s, skeleton loader.
11. **No automated tests.** Manual QA with two accounts for the privacy check.

---

## Ambiguities in the spec

- "Reasonable wait" is undefined — targeting <20s with skeleton, retry once above 30s.
- AI-extract vs. user-set for meeting date — making it AI-extract with user override.
- Manual add-action-item is implied by "action items can be added manually" — scheduled in Phase 5.
- Unticking clears `completed_at` — natural behavior, handled by a DB trigger.
- Search scope is title/transcript/summary (spec literal). Action-item text is excluded.

---

## Risky / worth cutting if behind schedule

- **tsvector search** → fall back to `ILIKE '%q%'` (saves ~10 min, indistinguishable at demo scale).
- **Manual add-action-item** → cut at 03:00 if not done (saves ~10 min).
- **Delete-confirmation dialog** → `confirm()` instead of shadcn Dialog (saves ~5 min).

---

## Design decisions

### Implementation notes (added during Phase 4A)

- **Test scripts**: Node 24's ESM resolver doesn't auto-try `.ts` extensions 
  on extensionless imports. Node scripts must be run via `pnpm dlx tsx 
  --env-file=.env.local scripts/<name>.ts`, not `node --experimental-strip-
  types`.
- **Module boundaries**: Files under `src/lib/ai/` use relative imports 
  (`../schemas`) rather than `@/` aliases, so they remain runnable from 
  plain-node scripts without a path-alias resolver. Do not auto-refactor 
  these to alias imports.
  
### Database schema

Two tables + one view. `user_id` is denormalized onto `action_items` so the dashboard query is a single indexed scan and RLS stays a simple `auth.uid() = user_id` check with no joins.

```sql
-- meetings
create table public.meetings (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  title           text not null,
  meeting_date    date not null default current_date,
  participants    text[] not null default '{}',
  raw_transcript  text not null,
  summary         text not null,
  decisions       text[] not null default '{}',
  blockers        text[] not null default '{}',
  followup_email  text not null default '',
  created_at      timestamptz not null default now()
);

create index meetings_user_created_idx
  on public.meetings (user_id, created_at desc);

create index meetings_fts_idx on public.meetings
  using gin (to_tsvector('english',
    coalesce(title,'') || ' ' ||
    coalesce(summary,'') || ' ' ||
    coalesce(raw_transcript,'')));

-- action_items
create table public.action_items (
  id            uuid primary key default gen_random_uuid(),
  meeting_id    uuid not null references public.meetings(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  content       text not null,
  owner         text,
  due_hint      text,
  is_done       boolean not null default false,
  completed_at  timestamptz,
  created_at    timestamptz not null default now()
);

create index action_items_dashboard_idx
  on public.action_items (user_id, is_done, created_at);
create index action_items_meeting_idx
  on public.action_items (meeting_id);

-- RLS
alter table public.meetings     enable row level security;
alter table public.action_items enable row level security;

create policy "meetings_owner_all" on public.meetings
  for all to authenticated
  using      (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "action_items_owner_all" on public.action_items
  for all to authenticated
  using      (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Trigger: maintain completed_at from is_done flips
create or replace function public.set_action_item_completed_at()
returns trigger language plpgsql as $$
begin
  if new.is_done and not old.is_done then
    new.completed_at := now();
  elsif not new.is_done and old.is_done then
    new.completed_at := null;
  end if;
  return new;
end $$;

create trigger action_items_completed_at
  before update on public.action_items
  for each row execute function public.set_action_item_completed_at();

-- View for the list page: meeting rows + open/total counts
-- security_invoker = true is CRITICAL — otherwise the view bypasses RLS
create view public.meetings_with_stats
  with (security_invoker = true) as
select
  m.*,
  coalesce(count(ai.id) filter (where ai.is_done = false), 0)::int as open_count,
  coalesce(count(ai.id), 0)::int                                  as total_count
from public.meetings m
left join public.action_items ai on ai.meeting_id = m.id
group by m.id;
```

The list page selects directly from `meetings_with_stats` — no correlated subquery in application code, open-count logic lives in one place in the schema.

### Structured output: tool use with two tools

Anthropic has no JSON mode. Tool use with `tool_choice: { type: "any" }` forces the model to call exactly one of:

- `record_debrief(title, meeting_date?, participants[], summary, decisions[], blockers[], action_items[{content, owner?, due_hint?}], followup_email)`
- `reject_input(reason)` — the "not a meeting" branch

The server action inspects `content[0].name` and returns a discriminated union. Re-validate the tool's `input` with Zod before trusting it.

### System prompt (literal)

```
You are a meeting debrief analyst. You receive a meeting transcript or rough notes and extract structured intelligence.

Rules you must never break:
- Only attribute an action item to a named owner if that name appears in the input. If no owner is explicit, leave owner empty.
- Never invent participants, decisions, dates, or commitments that aren't grounded in the input.
- Capture implicit commitments as action items — phrases like "I'll follow up on" or "we need to" count.
- The follow-up email is written in first person from the note-taker to the other participants. Confirm what was decided, list what happens next, keep it 120-180 words, professional but human, no subject line, no signature.
- meeting_date: if an explicit date appears in the transcript, use it (YYYY-MM-DD). Otherwise omit the field.
- If the input is clearly not a meeting — too short to analyze, single sentence, unrelated content, obvious test gibberish — call reject_input with a one-sentence friendly reason. Do not fabricate a meeting from nothing.

Call exactly one tool.
```

### Client/server boundaries

| Screen | Component | Notes |
|---|---|---|
| `/login`, `/signup` | Client | Form state + server action submit |
| `/` (dashboard) | Server | Fetches open action items; checkbox row is a client island |
| `/meetings` (list) | Server | Server-fetches rows; search input is a client island that updates `?q=` |
| `/meetings/new` | Server shell + client form | Client component owns textarea and review/edit state |
| `/meetings/[id]` | Server | Fetches meeting + items; checkboxes, copy-email, delete, transcript-toggle are client islands |

### Server actions vs route handlers

All mutations are **server actions**: `signIn`, `signUp`, `signOut`, `generateDebrief(input)`, `saveMeeting(draft)`, `toggleActionItem(id, isDone)`, `addActionItem(meetingId, content)`, `deleteMeeting(id)`. No route handlers in v1.

### "Not a meeting" handling

Handled at the tool-choice layer. Server action returns:

```ts
type DebriefResult =
  | { kind: 'draft';    draft: MeetingDraft }
  | { kind: 'rejected'; reason: string }
  | { kind: 'error';    message: string };
```

UI: `rejected` → amber banner with reason, textarea preserved, no navigation. `error` → red banner with retry, textarea preserved. `draft` → reveal review form.

---

## Phases

### Phase 0 — Plan artifacts (pre-code)

**Goal:** satisfy the workflow requirement.

**Tasks:**
- Capture the initial plan as `process/01-initial-plan.md` (and screenshot).
- Capture the refined plan as `process/03-refined-plan.md` (and screenshot).
- Maintain `TASKS.md` with at least 8 tasks; aim for 12+.

**Acceptance:** process artifacts present; task list open.
**Time:** within the spec's 00:00–00:30 block.

---

### Phase 1 — Scaffold, tooling, deployed empty app

**Goal:** a public Vercel URL showing a Next.js placeholder, auto-deploying from `main`.

**Tasks:**
- `pnpm create next-app@latest meeting-debrief --ts --tailwind --eslint --app --src-dir --import-alias "@/*"`.
- `pnpm dlx shadcn@latest init`. Add: `button input textarea card checkbox dialog sonner skeleton label badge accordion`.
- Prettier + `eslint-config-prettier` + `prettier-plugin-tailwindcss`; `format` and `lint` scripts.
- Runtime deps: `@supabase/ssr @supabase/supabase-js @anthropic-ai/sdk zod`.
- Commit `.env.local.example` with placeholders. Real values only in `.env.local`.
- Push to GitHub; import into Vercel; set env var placeholders; verify first deploy goes green.

**Files:** `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `components.json`, `.prettierrc`, `.eslintrc.json`, `.env.local.example`, `.gitignore`, `src/app/page.tsx`, `src/app/layout.tsx`.

**Acceptance:** Vercel URL returns 200 with a visible placeholder; `pnpm lint` and `pnpm build` pass locally.

**Time:** 25 min.

---

### Phase 2 — Supabase: project, schema, RLS, auth settings

**Goal:** database exists, is typed, and is provably isolating users; signup works without email delivery.

**Tasks:**
- Create a new Supabase project (free tier). Copy `URL` + `anon key`.
- Run the full SQL block from the schema section above in the SQL editor — tables, indexes, RLS policies, trigger, and `meetings_with_stats` view.
- **Disable email confirmation**: Supabase Dashboard → Authentication → Providers → Email → uncheck "Confirm email". Reason: free-tier SMTP is rate-limited to 3/hour and mail often never arrives, which would leave graders stuck. Document this tradeoff in the README (demo trades email verification for signup friction).
- Generate TS types: `pnpm dlx supabase gen types typescript --project-id <id> > src/lib/database.types.ts`.
- Add env vars locally and on Vercel: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `ANTHROPIC_API_KEY`. Service-role key never used — we never bypass RLS.
- RLS sanity check: create two test users; insert a meeting for user A; in the SQL editor simulate user B (`set local role authenticated; set local request.jwt.claim.sub = '<B-uuid>';`) and confirm `select * from meetings` returns 0.

**Files:** `src/lib/database.types.ts`, `.env.local`.

**Acceptance:** SQL ran clean; view returns rows with open/total counts; types generated; RLS second-user query returns zero rows; email confirmation is off in Supabase Auth settings.

**Time:** 25 min.

---

### Phase 3 — Auth + route protection

**Goal:** sign up, sign in, sign out work on the deployed URL; protected routes redirect anonymous users to `/login`; errors surface clearly.

**Tasks:**
- `src/lib/supabase/{server,client,middleware}.ts` per `@supabase/ssr` docs.
- `src/proxy.ts` (Next.js 16 naming; was `middleware.ts`) refreshes cookies and redirects unauthenticated requests on everything except `/login`, `/signup`, `/auth/*`, static assets.
- `src/app/(auth)/login/page.tsx` + `signup/page.tsx` — client forms calling server actions in `src/app/(auth)/actions.ts`.
- Signup server action: if `supabase.auth.signUp` returns an error, surface the message (`error.message`) to the UI — not a silent "check your email" success. Belt-and-suspenders in case email confirmation ever gets re-enabled.
- Sign-out server action wired to a button in the shared nav.
- Route groups: `(auth)` unauthenticated; `(app)` protected with a layout that reads the user and passes email to the nav.

**Files:** `src/proxy.ts`, `src/lib/supabase/{server,client,middleware}.ts`, `src/app/(auth)/{login,signup}/page.tsx`, `src/app/(auth)/actions.ts`, `src/app/(app)/layout.tsx`, `src/components/nav.tsx`.

**Acceptance:** on the deployed URL, signup creates a user with no email step, login works, refresh keeps you logged in, visiting `/` while logged out redirects to `/login`, visiting `/login` while logged in redirects to `/`. A deliberate bad signup (e.g. weak password) shows the real error text.

**Time:** 30 min. **Commit.**

---

### Phase 4 — Debrief flow

**Goal:** paste → AI → structured draft → review/edit → save, end-to-end.

**Tasks:**
- `src/lib/ai/anthropic.ts`: instantiate the SDK, export `debriefTranscript(text)`. Validate `text.length >= 40` before API call (client + server). Call `messages.create` with `model: 'claude-sonnet-4-6'`, system prompt, user = transcript, tools = [`record_debrief`, `reject_input`], `tool_choice: { type: 'any' }`, `max_tokens: 2048`. Return the discriminated union.
- `src/lib/schemas.ts`: Zod schemas for `MeetingDraft` and `ActionItemDraft`. Re-validate the model's `tool_use.input` against Zod.
- `src/app/(app)/meetings/new/page.tsx`: server shell.
- `src/app/(app)/meetings/new/new-meeting-form.tsx`: client component with two states — (a) input textarea + Debrief button, (b) populated review/edit form. On Save, call `saveMeeting`, `router.push('/meetings/<id>')`.
- `saveMeeting(draft)` server action: insert meeting row, batch-insert action items, return new id. Wrapped try/catch with toast on failure.
- Skeleton loader during the AI call; Debrief button disabled to block double-submit.
- Rejection UX: amber banner, reason, textarea preserved.
- Error UX: red banner, Try Again button, textarea preserved.

**Files:** `src/lib/ai/anthropic.ts`, `src/lib/ai/prompt.ts`, `src/lib/ai/tools.ts`, `src/lib/schemas.ts`, `src/app/(app)/meetings/new/{page.tsx,new-meeting-form.tsx,actions.ts}`, `src/components/draft-editor.tsx`.

**Acceptance:** paste a real transcript → structured draft within 20s → edit title + remove one action item → save → redirected to detail page with edits persisted. Paste "hello world" → friendly rejection, no DB write.

**Time:** 55 min. **Commit after save works.**

---

### Phase 5 — List, detail (with raw transcript), action-item checklist

**Goal:** meetings list, meeting detail with live checkboxes, manual add-item, and a collapsed "Original transcript" disclosure.

**Tasks:**
- `src/app/(app)/meetings/page.tsx`: server component. Query `select * from meetings_with_stats order by created_at desc` (view handles open_count). Each row: title, `meeting_date`, first 140 chars of summary, `X of Y open` badge. Empty state: "No meetings yet — start with your first debrief" + CTA.
- `src/app/(app)/meetings/[id]/page.tsx`: server component. Fetches meeting + action items (open first, then done). Renders:
  - Title, `meeting_date`, participants
  - Summary
  - Decisions (bullet list)
  - Blockers (bullet list)
  - Action-item checklist
  - Manual add-action-item input
  - Follow-up email with Copy button
  - **Original transcript** section — shadcn `Accordion` collapsed by default, expandable to show full `raw_transcript`. Collapsed because transcripts are long and the structured result is the primary content; expandable because the spec requires "access to the original raw transcript".
  - Delete button (opens confirmation dialog)
  - Back link to `/meetings`
- `src/components/action-item-row.tsx` (client): checkbox + text. `useOptimistic` for instant flip; calls `toggleActionItem(id, isDone)`. Revert + toast on failure.
- `src/components/add-action-item.tsx` (client): inline input + button, calls `addActionItem(meetingId, content)`, revalidates.
- `src/components/copy-email-button.tsx` (client): `navigator.clipboard.writeText`, sonner "Copied" toast.
- `src/components/delete-meeting-dialog.tsx` (client): shadcn Dialog confirming delete; calls `deleteMeeting(id)`, `router.push('/meetings')`.
- Transcript disclosure: inlined directly in the detail page as a shadcn `Accordion` (`multiple={false}`, collapsed by default) — not a separate component.

**Files:** all of the above, plus `src/app/(app)/meetings/[id]/actions.ts`, `src/app/(app)/meetings/actions.ts`.

**Acceptance:**
- List shows all meetings with accurate open-count from the view.
- Clicking a row opens detail; all six structured sections render.
- The "Original transcript" accordion is collapsed by default and reveals the full `raw_transcript` when expanded.
- Ticking a checkbox persists through refresh; `completed_at` gets set by the DB trigger.
- Adding a manual item appears immediately and persists.
- Deleting a meeting requires confirmation and removes it from the list.

**Time:** 45 min. **Commit.**

---

### Phase 6 — Dashboard (open work across all meetings)

**Goal:** the "what do I actually owe people" view.

**Tasks:**
- `src/app/(app)/page.tsx`: server component. Query:
  ```sql
  select ai.*, m.title as meeting_title, m.id as meeting_id
  from action_items ai
  join meetings m on m.id = ai.meeting_id
  where ai.user_id = auth.uid() and ai.is_done = false
  order by ai.created_at asc
  ```
- Render with `action-item-row` component + a `meetingLink` prop for the title-link.
- Empty state: "You're all clear. Debrief a meeting to start tracking work." + CTA.
- `toggleActionItem` revalidates both `/` and `/meetings/[id]`.

**Files:** `src/app/(app)/page.tsx`, small additions to `action-item-row.tsx`.

**Acceptance:** dashboard lists all open items across all meetings, oldest-first; ticking one removes it from the dashboard and marks done on the meeting detail.

**Time:** 15 min. **Commit.**

---

### Phase 7 — Search + polish + mobile + error handling

**Goal:** remaining core flows and the quality bar.

**Tasks:**
- **Search** on `/meetings`: client input updates `?q=` via `router.replace`. Server reads `searchParams.q` and runs:
  ```sql
  select * from meetings_with_stats
   where q is null
      or to_tsvector('english',
            coalesce(title,'')||' '||coalesce(summary,'')||' '||coalesce(raw_transcript,''))
         @@ websearch_to_tsquery('english', q)
   order by created_at desc;
  ```
  Fallback to `ILIKE` if behind schedule.
- **Empty states**: dashboard, meetings list, search-no-results — all designed, not blank.
- **Error states**: confirm AI-fail and DB-fail banners trigger and preserve textarea contents.
- **Mobile QA** at 375px: nav wraps or collapses, textarea is full-width, checkboxes tap-sized, detail page scrolls cleanly.
- `src/app/error.tsx` global error boundary with "Something went wrong" + reset.
- `<Toaster />` mounted once in the app layout.

**Files:** `src/app/(app)/meetings/page.tsx` + search island, `src/components/empty-state.tsx`, `src/app/error.tsx`, `src/app/(app)/layout.tsx`.

**Acceptance:** search returns correct matches; every list screen has an empty state; 375px-wide viewport is usable across dashboard + new-meeting + detail; disabling the Anthropic key and submitting shows a friendly error with the textarea intact.

**Time:** 35 min. **Commit.**

---

### Phase 8 — Deploy verification, README, demo, reflection

**Goal:** submission-ready.

**Tasks:**
- Final `main` push; wait for deploy; sign up a fresh third account on the live URL and run the happy path.
- **Two-account privacy test**: user A's meeting URL pasted into user B's browser returns 404 / "not found".
- **README.md**: one-sentence product description, live URL, stack, local setup (`.env.local`, `pnpm dev`), schema summary, note about email-confirmation-off tradeoff, rejection paragraph, written reflection (≤200 words), links to the three screenshots.
- **Demo video**, 2 min max: signup → paste transcript → debrief → edit title → save → tick an action item → refresh → dashboard → search → delete.
- Screenshots saved under `/docs/` in the repo (or referenced from `process/`).

**Files:** `README.md`, `/docs/*.png` or `process/*.png`.

**Acceptance:** all Section 6 self-check items from the spec pass; submission doc links to live URL, repo, video, screenshots.

**Time:** 30 min.

---

## Time budget

| Phase | Time | Running total |
|---|---|---|
| 0 — Plan artifacts | 30 min | 0:30 |
| 1 — Scaffold + deploy | 25 min | 0:55 |
| 2 — Supabase + schema + view + auth settings | 25 min | 1:20 |
| 3 — Auth | 30 min | 1:50 |
| 4 — Debrief flow | 55 min | 2:45 |
| 5 — List + detail + items + transcript | 45 min | 3:30 |
| 6 — Dashboard | 15 min | 3:45 |
| 7 — Search + polish | 35 min | 4:20 |
| 8 — README + demo | 30 min | 4:50 |

~50 min over budget on paper. **Planned cuts in order if behind**: (a) tsvector → ILIKE (−10 min); (b) manual add-action-item (−10 min); (c) delete-confirm dialog → `confirm()` (−5 min). Those cuts bring you back under 4:00 without touching any spec "core user flow".

---

## Verification

End-to-end checks run manually against the **deployed** URL (localhost is insufficient for the Vercel + email-confirmation-off behaviors):

1. A stranger can open the URL, sign up (no inbox required), paste a transcript, see a useful debrief, edit, and save.
2. The AI draft is editable before saving.
3. Ticking an action item and refreshing keeps it ticked; unticking clears `completed_at` (inspect row via Supabase Table Editor).
4. The dashboard shows open items from multiple meetings, sorted oldest-first; ticking on the dashboard updates the detail page.
5. A second account, signed up separately, sees zero of the first account's meetings. Direct URL access to another user's `/meetings/<id>` returns not-found.
6. Every list screen (dashboard, meetings list, search-no-results) shows a designed empty state.
7. The meeting detail page shows the "Original transcript" accordion collapsed; expanding it reveals the full `raw_transcript`.
8. Pasting "hello world" shows a friendly rejection banner with the textarea preserved, no DB write.
9. Temporarily setting `ANTHROPIC_API_KEY` to an invalid value and submitting shows a red error banner with the textarea intact.
10. On a 375px viewport (Chrome DevTools iPhone SE), dashboard, new-meeting, and detail are fully usable.
11. Git log shows ≥6 commits with meaningful messages.
12. Demo video plays end-to-end with no "ignore that" moments.

---

## Critical files (quick reference)

- Schema + view + RLS: applied via Supabase SQL editor (not in repo).
- Supabase clients: `src/lib/supabase/{server,client,middleware}.ts`
- Auth middleware (Next.js 16 proxy convention): `src/proxy.ts`
- Auth actions: `src/app/(auth)/actions.ts`
- AI client + prompt + tools: `src/lib/ai/{anthropic,prompt,tools}.ts`
- Zod schemas: `src/lib/schemas.ts`
- Debrief flow: `src/app/(app)/meetings/new/{page.tsx,new-meeting-form.tsx,actions.ts}`
- Detail page (transcript disclosure inlined via `Accordion`): `src/app/(app)/meetings/[id]/page.tsx`
- Action-item row (reused on detail + dashboard): `src/components/action-item-row.tsx`
- Dashboard: `src/app/(app)/page.tsx`
- Error boundary: `src/app/error.tsx`

---

## Changelog

Schema migrations applied via Supabase MCP after the initial schema landed. Each migration is idempotent and recorded in Supabase's `supabase_migrations.schema_migrations` table.

- **`fix_rls_initplan_and_function_search_path`** (Phase 2 advisor fixes) — rewrote the two RLS policies to use `(select auth.uid())` instead of `auth.uid()` so Postgres evaluates the call once per query (initplan) instead of per row; pinned `search_path = public` on the `set_action_item_completed_at()` trigger function to close the `mutable_search_path` advisor warning.
- **`add_fts_column_for_websearch_tsquery`** (Phase 7 tsvector column) — added `meetings.fts` as a `tsvector GENERATED ALWAYS AS ... STORED` over `title ‖ summary ‖ raw_transcript`; swapped the old expression-based `meetings_fts_idx` for a plain GIN index on the generated column; dropped and recreated `meetings_with_stats` so it re-exposes `fts` through the view.
