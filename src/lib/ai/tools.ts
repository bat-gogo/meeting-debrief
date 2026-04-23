import type Anthropic from "@anthropic-ai/sdk";

export const TOOLS: Anthropic.Messages.Tool[] = [
  {
    name: "record_debrief",
    description: "Record the structured debrief extracted from the meeting transcript.",
    input_schema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "A short, specific title for the meeting.",
        },
        meeting_date: {
          type: "string",
          description:
            "YYYY-MM-DD format. Omit this field if no explicit date appears in the input.",
        },
        participants: {
          type: "array",
          items: { type: "string" },
          description:
            "Names of participants mentioned in the input. Empty array if none mentioned.",
        },
        summary: {
          type: "string",
          description: "A concise 2-4 sentence summary of the meeting.",
        },
        decisions: {
          type: "array",
          items: { type: "string" },
          description: "Decisions that were made during the meeting.",
        },
        blockers: {
          type: "array",
          items: { type: "string" },
          description: "Blockers or open questions raised during the meeting.",
        },
        action_items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              content: {
                type: "string",
                description: "The action item itself.",
              },
              owner: {
                type: "string",
                description: "Named person responsible. Omit if no owner is explicit in the input.",
              },
              due_hint: {
                type: "string",
                description: "Free-text timing hint like 'by Friday' or 'next week'. Omit if none.",
              },
            },
            required: ["content"],
          },
          description:
            "List of action items. Include implicit commitments like 'I'll follow up on...' or 'we need to...'.",
        },
        followup_email: {
          type: "string",
          description:
            "A 120-180 word professional follow-up email written in first person from the note-taker. No subject line, no signature.",
        },
      },
      required: [
        "title",
        "participants",
        "summary",
        "decisions",
        "blockers",
        "action_items",
        "followup_email",
      ],
    },
  },
  {
    name: "reject_input",
    description:
      "Use when the input is clearly not a meeting transcript — too short, single sentence, unrelated content, or obvious test input. Provide a one-sentence friendly reason.",
    input_schema: {
      type: "object",
      properties: {
        reason: {
          type: "string",
          description: "A one-sentence friendly reason explaining why the input wasn't accepted.",
        },
      },
      required: ["reason"],
    },
  },
];
