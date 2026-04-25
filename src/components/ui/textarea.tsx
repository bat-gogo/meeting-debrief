import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "w-full rounded-lg border border-[var(--border)] bg-[var(--ink-000)] px-3 py-2.5 text-sm text-[var(--ink-800)] outline-none transition-[border-color,box-shadow] duration-150",
        "placeholder:text-[var(--ink-400)]",
        "focus:border-[var(--accent-500)] focus:ring-[3px] focus:ring-[var(--accent-050)]",
        "disabled:bg-[var(--ink-100)] disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-[var(--danger-600)] aria-invalid:ring-[3px] aria-invalid:ring-[oklch(0.62_0.20_27_/_0.20)]",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
