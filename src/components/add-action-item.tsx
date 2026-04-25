"use client";

import { Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { addActionItem } from "@/app/(app)/meetings/[id]/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AddActionItem({ meetingId }: { meetingId: string }) {
  const [content, setContent] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    startTransition(async () => {
      const result = await addActionItem(meetingId, content);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setContent("");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex items-center gap-2">
      <Input
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Add an action item…"
        disabled={isPending}
      />
      <Button type="submit" size="sm" disabled={!content.trim() || isPending}>
        <Plus className="size-3.5" />
        {isPending ? "Adding…" : "Add"}
      </Button>
    </form>
  );
}
