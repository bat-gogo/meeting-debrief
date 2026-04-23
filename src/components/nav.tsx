"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { signOut } from "@/app/(auth)/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export function Nav({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const onMeetings = pathname === "/meetings" || pathname.startsWith("/meetings/");

  function closeMenu() {
    setMenuOpen(false);
  }

  const meetingsLinkClass = cn(
    "text-sm transition-colors",
    onMeetings
      ? "text-foreground font-medium underline underline-offset-4"
      : "text-muted-foreground hover:text-foreground",
  );

  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="font-semibold tracking-tight">
          Meeting Debrief
        </Link>

        {/* Desktop nav — visible sm: and up */}
        <nav className="hidden items-center gap-3 sm:flex">
          <Link href="/meetings" className={meetingsLinkClass}>
            Meetings
          </Link>
          <Link href="/meetings/new" className={buttonVariants({ size: "sm" })}>
            New debrief
          </Link>
          <span className="text-muted-foreground max-w-[12rem] truncate text-sm">
            {userEmail}
          </span>
          <form action={signOut}>
            <Button type="submit" variant="outline" size="sm">
              Sign out
            </Button>
          </form>
        </nav>

        {/* Mobile trigger — visible below sm: */}
        <Button
          variant="outline"
          size="icon"
          aria-label="Open menu"
          className="sm:hidden"
          onClick={() => setMenuOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="right" className="flex w-72 flex-col">
          <SheetHeader>
            <SheetTitle>Menu</SheetTitle>
          </SheetHeader>
          <nav className="flex flex-1 flex-col gap-4 px-4 pb-4">
            <Link href="/meetings" onClick={closeMenu} className={meetingsLinkClass}>
              Meetings
            </Link>
            <Link
              href="/meetings/new"
              onClick={closeMenu}
              className={buttonVariants()}
            >
              New debrief
            </Link>
            <div className="mt-auto border-t pt-4">
              <p className="text-muted-foreground mb-2 truncate text-xs">{userEmail}</p>
              <form action={signOut}>
                <Button type="submit" variant="outline" className="w-full">
                  Sign out
                </Button>
              </form>
            </div>
          </nav>
        </SheetContent>
      </Sheet>
    </header>
  );
}
