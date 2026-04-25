import { CheckCircle2 } from "lucide-react";

import { ActionItemRow } from "@/components/action-item-row";
import { EmptyState } from "@/components/empty-state";
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
      <div className="mx-auto max-w-4xl px-6 py-10 md:px-8">
        <h1
          className="font-display text-[2.125rem] font-medium tracking-tight text-[var(--ink-900)]"
          style={{ fontVariationSettings: '"opsz" 60' }}
        >
          Dashboard
        </h1>
        <p className="mt-4 text-sm text-[var(--danger-600)]">
          Couldn&apos;t load action items: {error.message}
        </p>
      </div>
    );
  }

  const rows = items ?? [];

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 md:px-8">
      <div>
        <h1
          className="font-display text-[2.125rem] font-medium tracking-tight text-[var(--ink-900)]"
          style={{ fontVariationSettings: '"opsz" 60' }}
        >
          Dashboard
        </h1>
        <p className="mt-1.5 text-sm text-[var(--ink-500)]">
          Every open item, oldest first.
        </p>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="You're all clear."
          subtitle="Debrief a meeting to start tracking work."
          cta={{ href: "/meetings/new", label: "New debrief" }}
        />
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
