"use server";

import { debriefTranscript } from "@/lib/ai/anthropic";
import { type DebriefResult, type MeetingDraft } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";

export async function generateDebrief(text: string): Promise<DebriefResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { kind: "error", message: "Not authenticated." };
  }

  return debriefTranscript(text);
}

export async function saveMeeting(
  draft: MeetingDraft,
  raw_transcript: string,
): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  const { data: inserted, error: meetingErr } = await supabase
    .from("meetings")
    .insert({
      user_id: user.id,
      title: draft.title,
      ...(draft.meeting_date ? { meeting_date: draft.meeting_date } : {}),
      participants: draft.participants,
      raw_transcript,
      summary: draft.summary,
      decisions: draft.decisions,
      blockers: draft.blockers,
      followup_email: draft.followup_email,
    })
    .select("id")
    .single();

  if (meetingErr || !inserted) {
    return { error: meetingErr?.message ?? "Failed to save meeting." };
  }

  if (draft.action_items.length > 0) {
    const rows = draft.action_items.map((item) => ({
      meeting_id: inserted.id,
      user_id: user.id,
      content: item.content,
      owner: item.owner ?? null,
      due_hint: item.due_hint ?? null,
    }));
    const { error: itemsErr } = await supabase.from("action_items").insert(rows);
    if (itemsErr) {
      return { error: itemsErr.message };
    }
  }

  return { id: inserted.id };
}
