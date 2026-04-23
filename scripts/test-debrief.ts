import { debriefTranscript } from "../src/lib/ai/anthropic";

const TEST_A = `Sprint 24 retrospective — Product team — 2026-04-23.

Present: Jamie (PM), Alex (frontend), Priya (backend), Sam (design).

We kicked off by reviewing last sprint's commitments. Jamie noted the onboarding revamp shipped on time, though the completion rate metric dipped 2% — we need to understand why. Alex pointed out the new OAuth flow is 600ms slower than the old one in Chrome; Priya is going to dig into whether the session endpoint is the culprit and report back by Friday.

Sam walked us through the revised empty-state designs for the dashboard. We decided to replace the current illustration-heavy placeholder with the minimal copy-first version — it tested better in Monday's usability session. Sam will have the Figma updated by end of day tomorrow and hand off to Alex for implementation.

Priya raised a concern about the database migration backlog — we're at 11 pending migrations on staging and only one person who knows how the older ones work. We agreed this is a tech-debt risk but didn't decide on an owner this sprint. Jamie will put it on next week's planning agenda.

Blocker: the feature flag service has been flaky twice this week. Alex said he'll open a ticket with infra today.

I'll follow up with everyone once Priya posts the OAuth findings. Next retro is in two weeks.`;

const TEST_B = "hello world";

const TEST_C = `My tomato plants are really thriving this year. I switched to a different compost mix over the winter and the difference is obvious — the leaves are darker green and fruit set is earlier than last year. The cherry variety in particular has taken off. I've been picking about half a pound every two days for the last week. The downside is the slugs have noticed too — I went out yesterday morning and found three big ones on the lower leaves. I'm experimenting with crushed eggshells around the base, which I've read works well though I'm skeptical. Next year I want to try companion planting with basil; apparently the strong smell confuses pests and the basil also benefits from the tomato shade. Gardening is really a long game — what you do in autumn affects what happens in July. I'm thinking of extending the bed eastward next spring to give the squashes more room.`;

type TestCase = readonly [label: string, input: string];

const tests: readonly TestCase[] = [
  ["A", TEST_A],
  ["B", TEST_B],
  ["C", TEST_C],
];

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}

async function run() {
  for (const [label, input] of tests) {
    const startedAt = Date.now();
    const result = await debriefTranscript(input);
    const elapsedMs = Date.now() - startedAt;

    if (result.kind === "draft") {
      const d = result.draft;
      console.log(
        `${label}: draft - "${truncate(d.title, 80)}" | participants=${d.participants.length} | action_items=${d.action_items.length} | ${elapsedMs}ms`,
      );
    } else if (result.kind === "rejected") {
      console.log(`${label}: rejected - ${truncate(result.reason, 80)} | ${elapsedMs}ms`);
    } else {
      console.log(`${label}: error - ${truncate(result.message, 80)} | ${elapsedMs}ms`);
    }
  }
}

run().catch((err) => {
  console.error("Test run failed:", err);
  process.exit(1);
});
