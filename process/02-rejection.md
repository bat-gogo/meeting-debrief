# Plan Rejection & Revision Round

> Workshop artifact: documents the back-and-forth between the initial plan
> (`01-initial-plan.md`) and the refined plan (`03-refined-plan.md` / `PLAN.md`).
> The spec requires "at least one explicit rejection of an AI-proposed plan or edit."

### What I proposed initially

The first plan had three issues that the user caught:

- **Missing raw-transcript UI on the meeting detail page.** Phase 5's detail-page section listed "summary, participants, decisions, blockers, action-item list, follow-up email, copy button, delete, back link" — but no surfacing of the raw transcript. The spec explicitly says the detail page must offer "access to the original raw transcript." The column was in the schema but the UI never exposed it.
- **Dangling `meetings_with_stats` view reference.** Phase 5's list-page tasks mentioned the option of a Postgres view called `meetings_with_stats` "or a correlated subquery" — but Phase 2's SQL block never created the view. An ambiguous reference to a not-yet-defined object that would have caused confusion or a broken query at build time.
- **Demo-breaking Supabase auth default.** Plan didn't mention Supabase's default "Confirm email" setting. On the free-tier SMTP this rate-limits to 3 confirmation emails per hour and frequently doesn't deliver — a grader signing up on the live URL would get stuck on a "check your email" screen with no email arriving. Plus the proposed signup server action would have silently rendered a "check your email" success message rather than surfacing the underlying Supabase error.

Plus a softer item: **wishy-washy model choice.** I started with "use `claude-sonnet-4-5` as specified, but flag that `claude-sonnet-4-6` is the newer 4.x — you may want to upgrade." The user wanted a decision, not an option.

### User's pushback

Quoted verbatim:

> Strong plan overall — ready to approve with one real fix and two smaller tightenings. Please revise before I accept.
>
> 1) SPEC GAP on meeting detail page (Phase 5).
>
> The spec literally says: "Open a past meeting. Full view of everything that was extracted: summary, action items as a live checklist, decisions, blockers, follow-up email, AND ACCESS TO THE ORIGINAL RAW TRANSCRIPT."
>
> Your Phase 5 description of /meetings/[id] lists: "summary, participants, decisions, blockers, action-item list, follow-up email, delete, back link" — no raw transcript. The column is in the schema but the UI never surfaces it.
>
> Please revise Phase 5 to include a collapsed-by-default "Original transcript" section on the detail page — a <details>/<summary> disclosure or a shadcn Accordion works. Collapsed because transcripts are long and the structured result is the primary content; expandable because the spec requires access to it. Include this in the acceptance criterion for Phase 5.
>
> 2) SCHEMA INCONSISTENCY.
>
> Phase 5 mentions `meetings_with_stats` as a Postgres view option, but Phase 2 doesn't create one. Either add the view's CREATE VIEW to the Phase 2 SQL (my preference — keeps the list-page query trivial and the open-count logic in one place), or drop the mention from Phase 5 and commit to the correlated subquery. Don't leave the ambiguity.
>
> 3) DEMO-BREAKING AUTH DEFAULT.
>
> Supabase ships with "Confirm email" enabled by default. On free-tier SMTP, confirmation emails are rate-limited to 3/hour and sometimes don't arrive. A grader signing up on the live URL gets stuck. Add a sub-task to Phase 2: "Disable email confirmation in Supabase Dashboard → Authentication → Providers → Email → uncheck 'Confirm email'. Document this tradeoff in the README (demo trades email verification for signup friction)." Also make the signup server action surface the Supabase error clearly if confirmation ever gets turned back on — not a silent "check your email" success.
>
> 4) MODEL STRING — keep it claude-sonnet-4-6 as you suggested.
>
> Sonnet 4.6 is the right call for this app's single-shot structured extraction: fast response (matters for demo UX), cheap enough to experiment, and equally capable at tool-use on short transcripts. Opus 4.7 would be overkill for a non-agentic single JSON extraction. Lock it in and don't re-suggest a downgrade to 4-5.
>
> Regenerate the plan with these changes, keep everything else as-is. No other edits needed — the rest is solid.

### What I changed

Itemized list of edits between `01-initial-plan.md` and `03-refined-plan.md`:

1. **Phase 5, detail-page tasks** — added an explicit "Original transcript" section item: a shadcn `Accordion`, collapsed by default, expanding to reveal the full `raw_transcript`. New client component `src/components/transcript-disclosure.tsx` added to the file list.

2. **Phase 5, acceptance criterion** — added: "The 'Original transcript' accordion is collapsed by default and reveals the full `raw_transcript` when expanded."

3. **Phase 2, SQL block** — added a `CREATE VIEW public.meetings_with_stats` definition that aggregates `open_count` and `total_count` per meeting. The view is set with `with (security_invoker = true)` — a proactive addition I made on top of the user's request because Postgres views default to definer mode (owner = `postgres`), which would silently bypass RLS. With `security_invoker = true`, queries against the view run with the calling user's permissions and underlying-table RLS still applies. Without this, every user would see every meeting through the view, instantly breaking the privacy non-negotiable.

4. **Phase 5, list-page query** — removed the "or correlated subquery" ambiguity. Phase 5 now commits to `select * from meetings_with_stats order by created_at desc`.

5. **Phase 2, task list** — added an explicit sub-task: "Disable email confirmation in Supabase Dashboard → Authentication → Providers → Email → uncheck 'Confirm email'." Added to the Phase 2 acceptance criterion and to the Phase 8 README requirements (must document the tradeoff).

6. **Phase 3, signup server action** — added requirement: "if `supabase.auth.signUp` returns an error, surface the message (`error.message`) to the UI — not a silent 'check your email' success." Acceptance criterion gained: "A deliberate bad signup (e.g. weak password) shows the real error text."

7. **Phase 4, AI client** — hardcoded `model: 'claude-sonnet-4-6'` literal in the task description.

8. **Assumptions section** — assumption #1 rewritten from wishy-washy "use 4-5 but you may want to upgrade" to a committed "Model: `claude-sonnet-4-6`. Fast, cheap, equally capable at tool-use on short transcripts. Opus 4.7 is overkill for single-shot structured extraction."

9. **Phase 1 task list** — added `accordion` to the list of shadcn components to install (needed for the transcript disclosure).

10. **Time budget table** — Phase 2 estimate bumped from 20 → 25 min to absorb the view creation and email-confirmation step. Total budget recalculated.

11. **Verification section** — added two new manual checks: (7) "the meeting detail page shows the 'Original transcript' accordion collapsed; expanding it reveals the full `raw_transcript`," and confirmation that signup works without an inbox.
