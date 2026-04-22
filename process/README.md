# Workshop Process Artifacts

Workshop process artifacts for the **Meeting Debrief** assignment (Encorp Vibe Coding Workshop).

The spec requires demonstrating Plan Mode discipline before writing code: an initial plan, an explicit pushback round, a refined plan, and a final task list. This folder is the canonical record of that process.

## Files

- **`01-initial-plan.md`** — the first plan I produced from the spec, before user review. Contains three issues that were caught and fixed in the next round (missing raw-transcript UI on detail page, dangling `meetings_with_stats` view reference, Supabase email-confirmation default).
- **`02-rejection.md`** — the rejection round. Documents what I proposed initially, the user's verbatim pushback, and an itemized list of every change I made to the plan in response.
- **`03-refined-plan.md`** — the final plan after the user's review, frozen at the moment of approval. Same content as `/PLAN.md` at repo root, but `PLAN.md` is the living reference document we update as the build evolves; this file is the immutable submission snapshot.
- **`04-final-tasks.md`** — *(to be added at the end of the build)* a snapshot of `TASKS.md` showing the final state of completed and skipped tasks.
- **`01-initial-plan.png`** — *(to be added manually)* screenshot of the initial plan, per the spec's submission format.
- **`03-refined-plan.png`** — *(to be added manually)* screenshot of the refined plan.
- **`final-tasks.png`** — *(to be added manually)* screenshot of the final task list.

## Why both markdown and screenshots?

The workshop spec lists "screenshot" as the submission format for these artifacts. The markdown files are the **primary** record because they preserve full text, code blocks, SQL, and tables — none of which survive screenshotting cleanly, and all of which graders may want to copy from. The screenshots exist because the spec asks for them; the markdown is the canonical source.
