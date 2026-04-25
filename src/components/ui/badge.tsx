import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border px-2.5 py-0.5 text-[11.5px] font-medium whitespace-nowrap transition-colors duration-150 focus-visible:border-[var(--accent-500)] focus-visible:ring-[3px] focus-visible:ring-[var(--accent-050)] aria-invalid:border-[var(--danger-600)] aria-invalid:ring-[3px] aria-invalid:ring-[oklch(0.62_0.20_27_/_0.20)] [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[var(--accent-600)] text-[var(--ink-000)] [a]:hover:bg-[var(--accent-700)]",
        secondary:
          "border-[var(--border)] bg-[var(--ink-100)] text-[var(--ink-800)] [a]:hover:bg-[var(--ink-150)]",
        outline:
          "border-[var(--border)] bg-[var(--ink-000)] text-[var(--ink-700)] [a]:hover:bg-[var(--ink-100)] [a]:hover:text-[var(--ink-800)]",
        destructive:
          "border-transparent bg-[var(--danger-100)] text-[var(--danger-600)] [a]:hover:bg-[oklch(0.93_0.05_25)]",
        ghost:
          "border-transparent text-[var(--ink-600)] hover:bg-[var(--ink-100)] hover:text-[var(--ink-800)]",
        link: "border-transparent text-[var(--accent-600)] underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props,
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  });
}

export { Badge, badgeVariants };
