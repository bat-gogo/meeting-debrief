import { z } from "zod";

export const actionItemDraftSchema = z.object({
  content: z.string().min(1),
  owner: z.string().nullable().optional(),
  due_hint: z.string().nullable().optional(),
});

export const meetingDraftSchema = z.object({
  title: z.string().min(1),
  meeting_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "meeting_date must be YYYY-MM-DD")
    .optional(),
  participants: z.array(z.string()).default([]),
  summary: z.string(),
  decisions: z.array(z.string()).default([]),
  blockers: z.array(z.string()).default([]),
  action_items: z.array(actionItemDraftSchema).default([]),
  followup_email: z.string().default(""),
});

export const debriefResultSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("draft"), draft: meetingDraftSchema }),
  z.object({ kind: z.literal("rejected"), reason: z.string() }),
  z.object({ kind: z.literal("error"), message: z.string() }),
]);

export type ActionItemDraft = z.infer<typeof actionItemDraftSchema>;
export type MeetingDraft = z.infer<typeof meetingDraftSchema>;
export type DebriefResult = z.infer<typeof debriefResultSchema>;
