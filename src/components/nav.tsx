"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { signOut } from "@/app/(auth)/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Nav({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const onMeetings = pathname === "/meetings" || pathname.startsWith("/meetings/");

  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="font-semibold tracking-tight">
          Meeting Debrief
        </Link>
        <nav className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/meetings"
            className={cn(
              "text-sm transition-colors",
              onMeetings
                ? "text-foreground font-medium underline underline-offset-4"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Meetings
          </Link>
          <Link href="/meetings/new" className={buttonVariants({ size: "sm" })}>
            New debrief
          </Link>
          <span className="text-muted-foreground hidden max-w-[12rem] truncate text-sm sm:inline">
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
