"use client";

import { useState } from "react";

import { SearchInput } from "@/components/search-input";
import { cn } from "@/lib/utils";

export function MeetingsListShell({
  query,
  children,
}: {
  query: string;
  children: React.ReactNode;
}) {
  const [pending, setPending] = useState(false);
  return (
    <div className="mt-6 flex flex-col gap-6">
      <SearchInput defaultValue={query} onPendingChange={setPending} />
      <div className={cn("transition-opacity", pending && "opacity-60")}>{children}</div>
    </div>
  );
}
