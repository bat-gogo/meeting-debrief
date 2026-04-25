import Link from "next/link";
import { notFound } from "next/navigation";

import { ActionItemRow } from "@/components/action-item-row";
import { AddActionItem } from "@/components/add-action-item";
import { CopyEmailButton } from "@/components/copy-email-button";
import { DeleteMeetingDialog } from "@/components/delete-meeting-dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

function formatMeetingDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type PageProps = { params: Promise<{ id: string }> };

export default async function MeetingDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: meeting, error } = await supabase
    .from("meetings")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !meeting) notFound();

  const { data: items } = await supabase
    .from("action_items")
    .select("*")
    .eq("meeting_id", id)
    .order("is_done", { ascending: true })
    .order("created_at", { ascending: true });

  const actionItems = items ?? [];

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 md:px-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <Link
            href="/meetings"
            className="text-xs text-[var(--ink-500)] transition-colors duration-150 hover:text-[var(--ink-800)]"
          >
            ← All meetings
          </Link>
          <h1
            className="mt-3 font-display text-[2.125rem] font-medium tracking-tight text-[var(--ink-900)]"
            style={{ fontVariationSettings: '"opsz" 60' }}
          >
            {meeting.title}
          </h1>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-[var(--ink-500)]">
              {formatMeetingDate(meeting.meeting_date)}
            </span>
            {meeting.participants.map((p) => (
              <Badge key={p} variant="outline">
                {p}
              </Badge>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CopyEmailButton email={meeting.followup_email} />
          <DeleteMeetingDialog meetingId={meeting.id} meetingTitle={meeting.title} />
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-4">
        {/* Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-[1.6] text-[var(--ink-800)]">{meeting.summary}</p>
          </CardContent>
        </Card>

        {/* Decisions */}
        {meeting.decisions.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Decisions</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-2">
                {meeting.decisions.map((d, i) => (
                  <li
                    key={i}
                    className="relative pl-3.5 text-sm leading-[1.5] text-[var(--ink-800)] before:absolute before:left-0 before:top-[10px] before:size-1 before:rounded-full before:bg-[var(--ink-400)]"
                  >
                    {d}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}

        {/* Blockers */}
        {meeting.blockers.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Blockers</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-2">
                {meeting.blockers.map((b, i) => (
                  <li
                    key={i}
                    className="relative pl-3.5 text-sm leading-[1.5] text-[var(--ink-800)] before:absolute before:left-0 before:top-[10px] before:size-1 before:rounded-full before:bg-[var(--ink-400)]"
                  >
                    {b}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}

        {/* Action items */}
        <Card>
          <CardHeader>
            <CardTitle>Action items</CardTitle>
          </CardHeader>
          <CardContent>
            {actionItems.length === 0 ? (
              <p className="text-sm text-[var(--ink-500)]">No action items yet.</p>
            ) : (
              <ul className="flex flex-col">
                {actionItems.map((item) => (
                  <ActionItemRow key={item.id} item={item} />
                ))}
              </ul>
            )}
            <AddActionItem meetingId={meeting.id} />
          </CardContent>
        </Card>

        {/* Follow-up email */}
        {meeting.followup_email ? (
          <Card>
            <CardHeader>
              <CardTitle>Follow-up email</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-loose whitespace-pre-wrap text-[var(--ink-800)]">
                {meeting.followup_email}
              </p>
            </CardContent>
          </Card>
        ) : null}

        {/* Original transcript — collapsed by default. multiple={false} mirrors
            Radix `type="single"` for our base-ui Accordion primitive. */}
        <Accordion multiple={false}>
          <AccordionItem value="transcript">
            <AccordionTrigger>Original transcript</AccordionTrigger>
            <AccordionContent>
              <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-xs leading-[1.6] text-[var(--ink-600)]">
                {meeting.raw_transcript}
              </pre>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}
