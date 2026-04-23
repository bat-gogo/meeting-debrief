import Link from "next/link";

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

export default async function MeetingsListPage() {
  const supabase = await createClient();
  const { data: meetings, error } = await supabase
    .from("meetings_with_stats")
    .select("*")
    .order("created_at", { ascending: false });

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

      {rows.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-3 text-center">
          <h2 className="text-xl font-semibold">No meetings yet</h2>
          <p className="text-muted-foreground text-sm">
            Paste your first transcript to get started.
          </p>
          <Link href="/meetings/new" className={buttonVariants()}>
            New debrief
          </Link>
        </div>
      ) : (
        <ul className="mt-8 flex flex-col gap-3">
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
                    {m.summary ? <p className="mt-2 text-sm">{truncate(m.summary, 140)}</p> : null}
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
    </div>
  );
}
