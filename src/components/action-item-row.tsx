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
    <li className="flex items-start gap-3 border-t border-[var(--ink-150)] py-2.5 first:border-t-0">
      <div className="pt-[3px]">
        <Checkbox
          checked={optimisticIsDone}
          onCheckedChange={handleCheckedChange}
          aria-label={optimisticIsDone ? "Mark not done" : "Mark done"}
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p
          className={cn(
            "text-[14px] leading-[1.5] break-words",
            optimisticIsDone
              ? "text-[var(--ink-500)] line-through"
              : "text-[var(--ink-800)]",
          )}
        >
          {item.content}
        </p>
        {item.owner || item.due_hint ? (
          <p className="text-xs text-[var(--ink-500)]">
            {[item.owner, item.due_hint].filter(Boolean).join(" · ")}
          </p>
        ) : null}
        {meetingLink ? (
          <Link
            href={meetingLink.href}
            className="text-xs text-[var(--ink-500)] underline underline-offset-2 decoration-[var(--ink-300)] hover:text-[var(--ink-800)] hover:decoration-[var(--ink-500)]"
          >
            in {meetingLink.title}
          </Link>
        ) : null}
      </div>
    </li>
  );
}
