"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { signOut } from "@/app/(auth)/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Nav({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();

  // Active-state matchers — precise to avoid double-highlighting.
  const onDashboard = pathname === "/";
  const onMeetings =
    pathname === "/meetings" ||
    (pathname.startsWith("/meetings/") && pathname !== "/meetings/new");

  // Ghost-style nav link with 2px underline 13px below text on active.
  function navLinkClass(isActive: boolean) {
    return cn(
      "relative rounded-md px-3 py-1.5 text-sm transition-colors duration-150",
      isActive
        ? "font-medium text-[var(--ink-900)] underline decoration-2 underline-offset-[13px]"
        : "text-[var(--ink-500)] hover:bg-[var(--ink-100)] hover:text-[var(--ink-800)]",
    );
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[oklch(0.985_0.006_80_/_0.82)] backdrop-blur supports-[backdrop-filter]:bg-[oklch(0.985_0.006_80_/_0.72)]">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-6 py-3 md:px-8 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <span
            aria-hidden
            className="block size-[9px] rounded-full bg-[var(--accent-600)]"
          />
          <span
            className="font-display text-base font-semibold tracking-[-0.01em] text-[var(--ink-900)]"
            style={{ fontVariationSettings: '"opsz" 18' }}
          >
            Meeting Debrief
          </span>
        </Link>

        <nav className="flex flex-wrap items-center gap-1 sm:gap-2">
          <Link href="/" className={navLinkClass(onDashboard)}>
            Dashboard
          </Link>
          <Link href="/meetings" className={navLinkClass(onMeetings)}>
            Meetings
          </Link>
          <Link href="/meetings/new" className={buttonVariants({ size: "sm" })}>
            New debrief
          </Link>
          <span className="ml-1 hidden max-w-[10rem] truncate font-mono text-xs text-[var(--ink-500)] sm:inline">
            {userEmail}
          </span>
          <form action={signOut}>
            <Button type="submit" variant="outline" size="sm">
              Sign out
            </Button>
          </form>
        </nav>
      </div>
    </header>
  );
}
