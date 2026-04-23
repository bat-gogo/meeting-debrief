"use client";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function CopyEmailButton({ email }: { email: string }) {
  async function handleClick() {
    try {
      await navigator.clipboard.writeText(email);
      toast.success("Email copied");
    } catch {
      toast.error("Couldn't copy — select and copy manually");
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={!email}>
      Copy email
    </Button>
  );
}
