# Architecture

Why-not-how notes on the non-obvious decisions in Meeting Debrief. For setup and feature lists, see the top-level [README](../README.md). For the raw SQL, see [`database/migrations/`](../database/migrations).

---

## RLS is the entire privacy model — and `security_invoker` is why the view doesn't leak

The spec has a hard requirement: a user never sees another user's meetings or action items under any circumstance. The simplest way to enforce that in Postgres is Row Level Security, and the cleanest way to keep RLS simple is to denormalize `user_id` onto every user-owned row — `meetings.user_id` and `action_items.user_id` both. That lets every policy read as a single non-join expression:

```sql
create policy "meetings_owner_all" on public.meetings
  for all to authenticated
  using      ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
```

The `(select auth.uid())` wrapper is not ornamental. It promotes the `auth.uid()` call to an "initplan" — Postgres evaluates it once per query instead of once per row. Supabase's advisor specifically flags the naked form.

The subtle part is the view. The list page selects from `meetings_with_stats`:

```sql
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

By default, Postgres views run with the permissions of their **creator**, not their **caller**. A view created by `postgres` (as Supabase-managed views always are) would therefore bypass RLS entirely — every authenticated user querying the view would see every meeting in the database. `with (security_invoker = true)` flips that, making the view execute under the caller's role, so the underlying tables' RLS policies still apply when the view aggregates them.

This is a one-line setting with catastrophic consequences if missed. The initial plan didn't include it; it was added during plan review and is now explicit in the schema migration and documented in every migration change log.

---

## Tool-use for structured output, not prompt-engineered JSON

Anthropic's API has no JSON mode. You can prompt-engineer the model to return JSON, but three things go wrong often enough to matter:

1. **Malformed JSON** — a trailing comma, an unescaped quote, a markdown fence wrapping the object.
2. **Drift from the schema** — the model adds helpful-but-unrequested fields, or renames a key because it thought `action_items` was clearer as `tasks`.
3. **Silent ambiguity** — a clear "not a meeting" input still tries to produce a debrief, because the prompt asked for JSON and JSON is what it produces.

Tool-use removes all three. The app defines two tools — `record_debrief` for the happy path and `reject_input` for the "that's not a meeting" branch — and sends `tool_choice: { type: "any" }`, which tells Anthropic the model **must** call one of these tools, not return free text. The input schemas are enforced by the API before any response lands. The server then re-validates the tool's `input` with Zod as belt-and-braces against schema drift between generations.

The two-tool design is worth its own note. "Is this a meeting?" is a first-class question in the product. Rather than making the model emit an empty `record_debrief` with a flag, rejections are their own tool. The server action inspects `response.content[0].name` once and branches into a clean discriminated union:

```ts
type DebriefResult =
  | { kind: 'draft';    draft: MeetingDraft }
  | { kind: 'rejected'; reason: string }
  | { kind: 'error';    message: string };
```

The UI knows exactly how to render each kind (review form / amber banner / red banner) with no "maybe null" branching.

---

## Generated tsvector column over an expression index

Postgres supports full-text search via a GIN index on an expression like `to_tsvector('english', title || ' ' || summary || ...)`. That works, and it was the initial approach. The upgrade to a generated column — `meetings.fts tsvector GENERATED ALWAYS AS STORED` — pays for itself in three ways:

1. **Index maintenance moves to the database.** Postgres recomputes `fts` on every `INSERT`/`UPDATE` automatically. No triggers, no application-layer sync.
2. **The Supabase JS client talks to the column directly.** `.textSearch("fts", q, { type: "websearch", config: "english" })` is cleaner than encoding the expression in every query — and if the search ever needs to change (drop `raw_transcript`, add `participants`), it's a single migration, not a grep across the codebase.
3. **PostgREST includes `fts` in generated types automatically** — the Supabase TypeScript types pick the column up on regeneration. No manual type annotations to stay in sync.

The tradeoff is a small amount of extra storage per row (tsvectors are typically 20-40% of the source text size). For a personal meeting intelligence tool, that's negligible.

The search itself uses `websearch_to_tsquery('english', q)`, which parses Google-style operators: `sprint OR retro`, `"exact phrase"`, `-exclude`. Users don't need to know that — plain keyword search just works — but the affordance is there.

---

## `useOptimistic` + `useTransition` for checkbox flips

Ticking an action item should feel instant. The naïve approach (`await` the server action, then render the new state) introduces a 100-300 ms lag — enough to feel sluggish on a slow connection or a hot checkbox.

`useOptimistic` handles this with no manual rollback bookkeeping. The checkbox's rendered state comes from `useOptimistic(item.is_done)`, and inside a `useTransition`, the optimistic state is bumped the moment the user clicks. The server action runs, and one of two things happens:

- **Success**: `revalidatePath` runs on the server, the parent re-renders with the new `item.is_done`, and `useOptimistic` re-anchors to it. The optimistic value becomes the canonical value. No visible change.
- **Failure**: the transition ends, the optimistic state automatically reverts to the base (pre-click) value, and a toast fires with the error. The checkbox flips back without explicit rollback code.

This is cleaner than any "optimistically update, catch the error, revert manually" implementation would be.

---

## Revalidating both `/` and `/meetings/[id]`

Action-item mutations affect two views: the meeting detail page (the list containing the item) and the dashboard (the cross-meeting open-items feed). Any toggle, add, or delete has to refresh both, otherwise the user sees one view up-to-date and another stale.

```ts
revalidatePath("/meetings/[id]", "page"); // all instances of the dynamic route
revalidatePath("/");                       // the dashboard
```

The dynamic-route form (`"page"` as second arg with a literal `[id]`) revalidates every instance in one call — the server action doesn't need to know which specific meeting id is affected. For a single-user app with tens of meetings, the perf cost is meaningless.

`deleteMeeting` additionally revalidates `/meetings` (the list page). Client-side `router.push('/meetings')` after delete triggers a fresh render anyway, but the `revalidatePath` call makes the cache invalidation explicit rather than incidental.

---

## `(app)` vs `(auth)` route groups

Route groups in Next.js App Router (parenthesized folders) let you give different sections of the app different layouts without adding URL segments. Here:

- `src/app/(auth)/` wraps `/login` and `/signup` in a minimal centered layout with no nav. These pages must render for unauthenticated users — that's the whole point.
- `src/app/(app)/` wraps every other route in a protected layout that fetches the user server-side via `createClient()` and redirects to `/login` if absent. The shared `<Nav />` lives here too.

The root `src/app/layout.tsx` only owns the `<html>`/`<body>` shell, fonts, and the sonner `<Toaster />`. Both route groups inherit from it.

This structure makes the auth boundary physical, not conditional: every file in `(app)/` is inside a layout that guarantees a user. No per-page auth checks, no "did I remember to gate this route?" review pass.

---

## Next.js 16's `proxy` convention vs `middleware.ts`

Next.js 16 renamed the root-level `middleware.ts` convention to `proxy.ts`, with an exported function named `proxy` instead of `middleware`. The old name still works but emits a deprecation warning on every build.

The project was scaffolded before this rename, so the migration was done mid-build using Next's official codemod (`@next/codemod middleware-to-proxy`). The codemod is file-level — it renamed the Next convention file only. Our `src/lib/supabase/middleware.ts` helper keeps its name because it's not a Next convention file; it exports `updateSession`, which is our own naming.

The proxy is the single source of truth for auth cookie refresh. On every request (except public paths and static assets), it calls `updateSession`, which:

1. Creates a Supabase server client bound to the request's cookies.
2. Calls `supabase.auth.getUser()` — this refreshes the session token if near expiry and updates cookies on the response.
3. Redirects unauthenticated users away from protected routes.

The `(app)` layout's `getUser()` call is **defensive**, not primary — the proxy already redirected. But catching the miss at the layer that renders protected content is cheap insurance and a clean hard stop if the matcher ever slips.

---

## Server actions over route handlers for mutations

Every mutation — `signIn`, `signOut`, `signUp`, `generateDebrief`, `saveMeeting`, `toggleActionItem`, `addActionItem`, `deleteMeeting`, `deleteMeeting` — is a server action, not a route handler. Three reasons:

1. **Co-location.** Each action lives next to the component that calls it, inside the route-group folder. No separate `/api/meetings/[id]/toggle` endpoint to name, version, document.
2. **`revalidatePath` is a first-class tool.** Invalidating `/` after a toggle is one function call in the action — no manual refetch on the client, no stale-while-revalidate dance.
3. **Type safety end-to-end.** The action's argument types and return types are shared with the client component calling it, with no hand-written request/response contracts.

The one tradeoff is that server actions don't support streaming responses. If a future feature needed a streamed AI response (`text/event-stream`), it would move to a route handler. For the current single-POST debrief with a skeleton loader, the server action is the right tool.

---

## Load state UX: elapsed counter + rotating status

The AI debrief takes 10-15 seconds. A pulse-animated skeleton alone feels frozen — users start wondering if the page died. The in-flight state now shows three additional affordances:

1. **Elapsed counter** (`0s`, `1s`, ... updated every 250 ms via `useEffect` + `setInterval`).
2. **Rotating status message** — four phases (`Reading the transcript` → `Extracting decisions and action items` → `Drafting the follow-up email` → `Almost there`), one every 4 seconds.
3. **Transcript stays visible** (disabled + opacity-50) so users can re-read their pasted content while they wait, instead of staring at skeletons.

This was a Phase-7.5 polish after Chrome testing surfaced that real users interpret skeleton-only loads as frozen pages. The lesson: skeletons communicate layout, they don't communicate progress. Both matter.
