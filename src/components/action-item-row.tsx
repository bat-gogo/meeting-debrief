"use client";

import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";

import { toggleActionItem } from "@/app/(app)/meetings/[id]/actions";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export type ActionItemRowItem = {
  id: string;
  content: string;
  owner: string | null;
  due_hint: string | null;
  is_done: boolean;
};

export function ActionItemRow({
  item,
  meetingLink,
}: {
  item: ActionItemRowItem;
  meetingLink?: { href: string; title: string };
}) {
  const [optimisticIsDone, setOptimisticIsDone] = useOptimistic<boolean, boolean>(
    item.is_done,
    (_state, newValue) => newValue,
  );
  const [, startTransition] = useTransition();

  function handleCheckedChange(checked: boolean) {
    startTransition(async () => {
      setOptimisticIsDone(checked);
      const result = await toggleActionItem(item.id, checked);
      if ("error" in result) {
        toast.error(result.error);
      }
    });
  }

  return (
    <li className="flex items-start gap-3 py-2">
      <div className="pt-0.5">
        <Checkbox
          checked={optimisticIsDone}
          onCheckedChange={handleCheckedChange}
          aria-label={optimisticIsDone ? "Mark not done" : "Mark done"}
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p
          className={cn(
            "text-sm break-words",
            optimisticIsDone && "text-muted-foreground line-through",
          )}
        >
          {item.content}
        </p>
        {item.owner || item.due_hint ? (
          <p className="text-muted-foreground text-xs">
            {[item.owner, item.due_hint].filter(Boolean).join(" · ")}
          </p>
        ) : null}
        {meetingLink ? (
          <Link
            href={meetingLink.href}
            className="text-muted-foreground hover:text-foreground text-xs underline underline-offset-2"
          >
            in {meetingLink.title}
          </Link>
        ) : null}
      </div>
    </li>
  );
}
