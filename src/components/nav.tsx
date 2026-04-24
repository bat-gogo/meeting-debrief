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

  // Ghost-style nav link: muted text by default, foreground + bold +
  // underline when active. No background change, keeps visual weight
  // light so the CTA reads as the only emphatic element.
  function navLinkClass(isActive: boolean) {
    return cn(
      "rounded-md px-3 py-1.5 text-sm transition-colors",
      isActive
        ? "text-foreground font-medium underline underline-offset-4 decoration-2"
        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
    );
  }

  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/" className="font-semibold tracking-tight">
          Meeting Debrief
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
          <span className="text-muted-foreground ml-1 hidden max-w-[10rem] truncate text-sm sm:inline">
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
