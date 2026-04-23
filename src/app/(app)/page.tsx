import Link from "next/link";

import { ActionItemRow } from "@/components/action-item-row";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: items, error } = await supabase
    .from("action_items")
    .select("*, meetings!inner(id, title)")
    .eq("is_done", false)
    .order("created_at", { ascending: true });

  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-destructive mt-4 text-sm">
          Couldn&apos;t load action items: {error.message}
        </p>
      </div>
    );
  }

  const rows = items ?? [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1 text-sm">Every open item, oldest first.</p>
      </div>

      {rows.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-3 text-center">
          <h2 className="text-xl font-semibold">You&apos;re all clear.</h2>
          <p className="text-muted-foreground text-sm">
            Debrief a meeting to start tracking work.
          </p>
          <Link href="/meetings/new" className={buttonVariants()}>
            New debrief
          </Link>
        </div>
      ) : (
        <Card className="mt-8">
          <CardContent>
            <ul className="flex flex-col">
              {rows.map((item) => (
                <ActionItemRow
                  key={item.id}
                  item={item}
                  meetingLink={{
                    href: `/meetings/${item.meetings.id}`,
                    title: item.meetings.title,
                  }}
                />
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
