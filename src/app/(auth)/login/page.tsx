"use client";

import Link from "next/link";
import { useActionState } from "react";

import { signIn } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AuthState = { error: string } | undefined;

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(signIn, undefined);

  return (
    <div className="flex w-full max-w-[400px] flex-col items-center gap-6">
      <div className="inline-flex items-center gap-2.5">
        <span aria-hidden className="block size-[9px] rounded-full bg-[var(--accent-600)]" />
        <span
          className="font-display text-[20px] font-semibold tracking-[-0.01em] text-[var(--ink-900)]"
          style={{ fontVariationSettings: '"opsz" 24' }}
        >
          Meeting Debrief
        </span>
      </div>

      <div className="w-full rounded-2xl border border-[var(--border)] bg-[var(--ink-000)] p-7 shadow-sm">
        <h1
          className="font-display text-[1.625rem] font-medium tracking-tight text-[var(--ink-900)]"
          style={{ fontVariationSettings: '"opsz" 36' }}
        >
          Sign in
        </h1>
        <p className="mt-1.5 text-sm text-[var(--ink-500)]">Welcome back to Meeting Debrief.</p>

        <form action={formAction} className="mt-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
            />
          </div>
          {state?.error ? (
            <p className="text-sm text-[var(--danger-600)]" role="alert">
              {state.error}
            </p>
          ) : null}
          <Button type="submit" className="mt-2 w-full" disabled={pending}>
            {pending ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        <p className="mt-5 text-center text-xs text-[var(--ink-500)]">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="text-[var(--ink-800)] underline underline-offset-2 decoration-[var(--ink-300)] hover:decoration-[var(--ink-500)]"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
