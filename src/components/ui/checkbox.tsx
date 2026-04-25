"use client";

import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";

import { cn } from "@/lib/utils";
import { CheckIcon } from "lucide-react";

function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer relative flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border-[1.5px] border-[var(--ink-300)] bg-[var(--ink-000)] transition-colors duration-150 outline-none",
        "hover:border-[var(--ink-400)]",
        "data-checked:border-[var(--accent-600)] data-checked:bg-[var(--accent-600)] data-checked:text-[var(--ink-000)]",
        "focus-visible:border-[var(--accent-500)] focus-visible:ring-[3px] focus-visible:ring-[var(--accent-050)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-[var(--danger-600)] aria-invalid:ring-[3px] aria-invalid:ring-[oklch(0.62_0.20_27_/_0.20)]",
        "after:absolute after:-inset-x-3 after:-inset-y-2",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-none [&>svg]:size-[11px]"
      >
        <CheckIcon strokeWidth={3} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
