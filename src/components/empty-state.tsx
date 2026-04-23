import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export function EmptyState({
  title,
  subtitle,
  cta,
}: {
  title: string;
  subtitle: string;
  cta?: { href: string; label: string };
}) {
  return (
    <div className="mt-16 flex flex-col items-center gap-3 text-center">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="text-muted-foreground text-sm">{subtitle}</p>
      {cta ? (
        <Link href={cta.href} className={buttonVariants()}>
          {cta.label}
        </Link>
      ) : null}
    </div>
  );
}
