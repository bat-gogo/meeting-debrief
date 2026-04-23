"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const DEBOUNCE_MS = 300;

export function SearchInput({
  defaultValue = "",
  onPendingChange,
}: {
  defaultValue?: string;
  onPendingChange?: (pending: boolean) => void;
}) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);
  const [isPending, startTransition] = useTransition();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Propagate the transition's pending state to any parent that wants to
  // dim or otherwise reflect that a new result set is on the way.
  useEffect(() => {
    onPendingChange?.(isPending);
  }, [isPending, onPendingChange]);

  // Clean up any pending debounce on unmount.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    setValue(next);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const trimmed = next.trim();
      const href = trimmed ? `/meetings?q=${encodeURIComponent(trimmed)}` : "/meetings";
      startTransition(() => {
        router.replace(href, { scroll: false });
      });
    }, DEBOUNCE_MS);
  }

  return (
    <Input
      type="search"
      placeholder="Search title, summary, or transcript…"
      value={value}
      onChange={handleChange}
      className={cn("transition-opacity", isPending && "opacity-60")}
      aria-label="Search meetings"
      autoComplete="off"
    />
  );
}
