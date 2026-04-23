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
      <div className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-3xl font-bold tracking-tight">Meetings</h1>
        <p className="text-destructive mt-4 text-sm">
          Couldn&apos;t load meetings: {error.message}
        </p>
      </div>
    );
  }

  const rows = meetings ?? [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Meetings</h1>
          <p className="text-muted-foreground mt-1 text-sm">Your debrief history.</p>
        </div>
        <Link href="/meetings/new" className={buttonVariants()}>
          New debrief
        </Link>
      </div>

      <MeetingsListShell query={query}>
        {rows.length === 0 ? (
          query ? (
            <EmptyState
              title="No meetings match your search."
              subtitle={`No results for "${query}". Try different keywords.`}
            />
          ) : (
            <EmptyState
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
                  className="hover:bg-muted/50 block rounded-xl border p-4 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <h2 className="font-medium">{m.title}</h2>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {m.meeting_date ? formatMeetingDate(m.meeting_date) : ""}
                      </p>
                      {m.summary ? (
                        <p className="mt-2 text-sm">{truncate(m.summary, 140)}</p>
                      ) : null}
                    </div>
                    <Badge variant={(m.open_count ?? 0) > 0 ? "default" : "secondary"}>
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
