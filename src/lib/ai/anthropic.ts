import Anthropic from "@anthropic-ai/sdk";

import { meetingDraftSchema, type DebriefResult } from "../schemas";

import { SYSTEM_PROMPT } from "./prompt";
import { TOOLS } from "./tools";

const MIN_INPUT_LENGTH = 40;
const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 2048;

export async function debriefTranscript(text: string): Promise<DebriefResult> {
  if (text.length < MIN_INPUT_LENGTH) {
    return { kind: "rejected", reason: "Input is too short to be a meeting." };
  }

  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: text }],
      tools: TOOLS,
      tool_choice: { type: "any" },
    });

    if (process.env.DEBUG_AI) {
      console.error(
        `[ai] tokens: in=${response.usage.input_tokens} out=${response.usage.output_tokens}`,
      );
    }

    const toolUse = response.content.find((block) => block.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      return { kind: "error", message: "AI did not call a tool." };
    }

    if (toolUse.name === "reject_input") {
      const input = toolUse.input as { reason?: unknown };
      return {
        kind: "rejected",
        reason: typeof input.reason === "string" ? input.reason : "Not a meeting.",
      };
    }

    if (toolUse.name === "record_debrief") {
      const parsed = meetingDraftSchema.safeParse(toolUse.input);
      if (!parsed.success) {
        return {
          kind: "error",
          message: `AI returned malformed structure: ${parsed.error.message}`,
        };
      }
      return { kind: "draft", draft: parsed.data };
    }

    return { kind: "error", message: `AI called unknown tool: ${toolUse.name}` };
  } catch (err) {
    return {
      kind: "error",
      message: err instanceof Error ? err.message : "Unknown AI error",
    };
  }
}
