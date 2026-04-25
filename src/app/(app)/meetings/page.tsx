import { FileText, Search } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { MeetingsListShell } from "@/components/meetings-list-shell";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

function formatMeetingDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function truncate(s: string, n: number) {
  return s.length <= n ? s : s.slice(0, n).trimEnd() + "…";
}

type PageProps = { searchParams: Promise<{ q?: string }> };

export default async function MeetingsListPage({ searchParams }: PageProps) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  const supabase = await createClient();
  let builder = supabase
    .from("meetings_with_stats")
    .select("*")
    .order("created_at", { ascending: false });

  if (query) {
    builder = builder.textSearch("fts", query, {
      type: "websearch",
      config: "english",
    });
  }

  const { data: meetings, error } = await builder;

  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-10 md:px-8">
        <h1
          className="font-display text-[2.125rem] font-medium tracking-tight text-[var(--ink-900)]"
          style={{ fontVariationSettings: '"opsz" 60' }}
        >
          Meetings
        </h1>
        <p className="mt-4 text-sm text-[var(--danger-600)]">
          Couldn&apos;t load meetings: {error.message}
        </p>
      </div>
    );
  }

  const rows = meetings ?? [];

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 md:px-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1
            className="font-display text-[2.125rem] font-medium tracking-tight text-[var(--ink-900)]"
            style={{ fontVariationSettings: '"opsz" 60' }}
          >
            Meetings
          </h1>
          <p className="mt-1.5 text-sm text-[var(--ink-500)]">Your debrief history.</p>
        </div>
        <Link href="/meetings/new" className={buttonVariants()}>
          New debrief
        </Link>
      </div>

      <MeetingsListShell query={query}>
        {rows.length === 0 ? (
          query ? (
            <EmptyState
              icon={Search}
              title="No meetings match your search."
              subtitle={`No results for "${query}". Try different keywords.`}
            />
          ) : (
            <EmptyState
              icon={FileText}
              title="No meetings yet"
              subtitle="Paste your first transcript to get started."
              cta={{ href: "/meetings/new", label: "New debrief" }}
            />
          )
        ) : (
          <ul className="flex flex-col gap-3">
            {rows.map((m) => (
              <li key={m.id ?? ""}>
                <Link
                  href={`/meetings/${m.id}`}
                  className="block rounded-xl border border-[var(--border)] bg-[var(--ink-000)] p-5 shadow-xs transition-colors duration-150 hover:bg-[var(--ink-050)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <h2 className="text-[15px] font-semibold text-[var(--ink-900)]">
                        {m.title}
                      </h2>
                      <p className="mt-1 font-mono text-xs text-[var(--ink-500)]">
                        {m.meeting_date ? formatMeetingDate(m.meeting_date) : ""}
                      </p>
                      {m.summary ? (
                        <p className="mt-2.5 text-sm leading-[1.5] text-[var(--ink-700)]">
                          {truncate(m.summary, 140)}
                        </p>
                      ) : null}
                    </div>
                    <Badge variant={(m.open_count ?? 0) > 0 ? "secondary" : "outline"}>
                      {m.open_count ?? 0} of {m.total_count ?? 0} open
                    </Badge>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </MeetingsListShell>
    </div>
  );
}
