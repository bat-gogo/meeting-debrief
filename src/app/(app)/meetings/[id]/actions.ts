"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export async function toggleActionItem(
  itemId: string,
  newIsDone: boolean,
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { error } = await supabase
    .from("action_items")
    .update({ is_done: newIsDone })
    .eq("id", itemId);

  if (error) return { error: error.message };

  revalidatePath("/meetings/[id]", "page");
  revalidatePath("/");
  return { ok: true };
}

export async function addActionItem(
  meetingId: string,
  content: string,
): Promise<{ ok: true; id: string } | { error: string }> {
  const trimmed = content.trim();
  if (!trimmed) return { error: "Action item cannot be empty." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { data, error } = await supabase
    .from("action_items")
    .insert({
      meeting_id: meetingId,
      user_id: user.id,
      content: trimmed,
    })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "Failed to add action item." };

  revalidatePath("/meetings/[id]", "page");
  revalidatePath("/");
  return { ok: true, id: data.id };
}

export async function deleteMeeting(meetingId: string): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { error } = await supabase.from("meetings").delete().eq("id", meetingId);

  if (error) return { error: error.message };

  revalidatePath("/meetings");
  revalidatePath("/");
  return { ok: true };
}
