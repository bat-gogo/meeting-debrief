import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export function EmptyState({
  title,
  subtitle,
  cta,
  icon: Icon,
}: {
  title: string;
  subtitle: string;
  cta?: { href: string; label: string };
  icon?: LucideIcon;
}) {
  return (
    <div className="flex flex-col items-center gap-4 pt-[100px] text-center">
      {Icon ? (
        <div className="flex size-14 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--ink-100)]">
          <Icon className="size-6 text-[var(--ink-500)]" strokeWidth={1.75} />
        </div>
      ) : null}
      <div className="flex flex-col gap-1.5">
        <h2
          className="font-display text-[1.625rem] font-medium tracking-tight text-[var(--ink-900)]"
          style={{ fontVariationSettings: '"opsz" 36' }}
        >
          {title}
        </h2>
        <p className="text-sm text-[var(--ink-500)]">{subtitle}</p>
      </div>
      {cta ? (
        <Link href={cta.href} className={buttonVariants()}>
          {cta.label}
        </Link>
      ) : null}
    </div>
  );
}
