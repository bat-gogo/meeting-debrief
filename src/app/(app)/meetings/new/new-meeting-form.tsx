"use client";

import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { generateDebrief, saveMeeting } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ActionItemDraft, MeetingDraft } from "@/lib/schemas";
import { cn } from "@/lib/utils";

const MIN_LENGTH = 40;

const LOADING_MESSAGES = [
  "Reading the transcript",
  "Extracting decisions and action items",
  "Drafting the follow-up email",
  "Almost there",
];

type Mode = "input" | "loading" | "review" | "saving";
type Banner = { kind: "rejected"; reason: string } | { kind: "error"; message: string };

export function NewMeetingForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("input");
  const [transcript, setTranscript] = useState("");
  const [draft, setDraft] = useState<MeetingDraft | null>(null);
  const [participantsText, setParticipantsText] = useState("");
  const [banner, setBanner] = useState<Banner | null>(null);
  const [elapsed, setElapsed] = useState(0);

  // Tick an elapsed-seconds counter while the AI call is in flight.
  // Reset happens imperatively at mode transitions (not here) to keep
  // this effect free of synchronous setState at the body level.
  useEffect(() => {
    if (mode !== "loading") return;
    const start = Date.now();
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 250);
    return () => clearInterval(interval);
  }, [mode]);

  const loadingMessage =
    LOADING_MESSAGES[Math.min(Math.floor(elapsed / 4), LOADING_MESSAGES.length - 1)];

  async function handleDebrief() {
    setBanner(null);
    if (transcript.trim().length < MIN_LENGTH) {
      setBanner({
        kind: "rejected",
        reason: "Input is too short to be a meeting transcript.",
      });
      return;
    }
    setElapsed(0);
    setMode("loading");
    try {
      const result = await generateDebrief(transcript);
      if (result.kind === "draft") {
        setDraft(result.draft);
        setParticipantsText(result.draft.participants.join(", "));
        setMode("review");
      } else if (result.kind === "rejected") {
        setBanner({ kind: "rejected", reason: result.reason });
        setMode("input");
      } else {
        setBanner({ kind: "error", message: result.message });
        setMode("input");
      }
    } catch (err) {
      setBanner({
        kind: "error",
        message: err instanceof Error ? err.message : "Unexpected error.",
      });
      setMode("input");
    }
  }

  async function handleSave() {
    if (!draft) return;
    // Commit participantsText → draft.participants right before save.
    const committedDraft: MeetingDraft = {
      ...draft,
      participants: parseParticipants(participantsText),
    };
    setMode("saving");
    try {
      const result = await saveMeeting(committedDraft, transcript);
      if ("error" in result) {
        toast.error(result.error);
        setMode("review");
        return;
      }
      router.push(`/meetings/${result.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed.");
      setMode("review");
    }
  }

  function handleStartOver() {
    setDraft(null);
    setParticipantsText("");
    setBanner(null);
    setElapsed(0);
    setMode("input");
  }

  function updateDraft<K extends keyof MeetingDraft>(key: K, value: MeetingDraft[K]) {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
  }

  if (mode === "review" || mode === "saving") {
    if (!draft) return null;
    return (
      <DraftEditor
        draft={draft}
        updateDraft={updateDraft}
        participantsText={participantsText}
        setParticipantsText={setParticipantsText}
        saving={mode === "saving"}
        onSave={handleSave}
        onStartOver={handleStartOver}
      />
    );
  }

  const isLoading = mode === "loading";

  return (
    <div className="flex flex-col gap-4">
      {banner ? <BannerView banner={banner} /> : null}
      <Label htmlFor="transcript" className="sr-only">
        Transcript
      </Label>
      <Textarea
        id="transcript"
        rows={12}
        placeholder="Paste your meeting transcript or rough notes here…"
        value={transcript}
        onChange={(e) => setTranscript(e.target.value)}
        disabled={isLoading}
        className={cn("min-h-64 transition-opacity", isLoading && "opacity-50")}
      />
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-xs text-[var(--ink-500)]">
          {transcript.length.toLocaleString()} chars
        </span>
        <Button onClick={handleDebrief} disabled={transcript.length === 0 || mode !== "input"}>
          <Sparkles className="size-3.5" />
          {isLoading ? "Debriefing…" : "Debrief"}
        </Button>
      </div>
      {isLoading ? <LoadingSkeleton message={loadingMessage} elapsed={elapsed} /> : null}
    </div>
  );
}

function BannerView({ banner }: { banner: Banner }) {
  const styles =
    banner.kind === "rejected"
      ? "border-[var(--warn-700)]/30 bg-[var(--warn-100)] text-[var(--warn-700)]"
      : "border-[var(--danger-600)]/30 bg-[var(--danger-100)] text-[var(--danger-600)]";
  const title =
    banner.kind === "rejected" ? "That doesn't look like a meeting" : "Something went wrong";
  const body = banner.kind === "rejected" ? banner.reason : banner.message;
  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${styles}`} role="alert">
      <div className="font-medium">{title}</div>
      <div className="mt-1 opacity-90">{body}</div>
    </div>
  );
}

function LoadingSkeleton({ message, elapsed }: { message: string; elapsed: number }) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-[var(--border)] bg-[var(--ink-000)] p-5 shadow-xs">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--ink-700)]">
          <span className="mr-1.5 inline-block animate-pulse text-[var(--accent-600)]">●</span>
          {message}…
        </p>
        <p className="font-mono text-xs tabular-nums text-[var(--ink-500)]">{elapsed}s</p>
      </div>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <div className="skeleton h-7 w-2/3" />
          <div className="skeleton h-3.5 w-32" />
        </div>
        <div className="flex flex-col gap-2">
          <div className="skeleton h-4 w-24" />
          <div className="skeleton h-3.5 w-full" />
          <div className="skeleton h-3.5 w-full" />
          <div className="skeleton h-3.5 w-2/3" />
        </div>
        <div className="flex flex-col gap-2">
          <div className="skeleton h-4 w-24" />
          <div className="skeleton h-3.5 w-5/6" />
          <div className="skeleton h-3.5 w-4/6" />
          <div className="skeleton h-3.5 w-5/6" />
        </div>
        <div className="flex flex-col gap-2">
          <div className="skeleton h-4 w-28" />
          <div className="skeleton h-3.5 w-full" />
          <div className="skeleton h-3.5 w-full" />
          <div className="skeleton h-3.5 w-4/5" />
          <div className="skeleton h-3.5 w-3/5" />
        </div>
        <div className="flex flex-col gap-2">
          <div className="skeleton h-4 w-32" />
          <div className="skeleton h-20 w-full" />
        </div>
      </div>
    </div>
  );
}

function parseParticipants(text: string): string[] {
  return text
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

type DraftEditorProps = {
  draft: MeetingDraft;
  updateDraft: <K extends keyof MeetingDraft>(key: K, value: MeetingDraft[K]) => void;
  participantsText: string;
  setParticipantsText: (value: string) => void;
  saving: boolean;
  onSave: () => void;
  onStartOver: () => void;
};

function DraftEditor({
  draft,
  updateDraft,
  participantsText,
  setParticipantsText,
  saving,
  onSave,
  onStartOver,
}: DraftEditorProps) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave();
      }}
      className="flex flex-col gap-8"
    >
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="title">Title</Label>
          <Textarea
            id="title"
            rows={1}
            value={draft.title}
            onChange={(e) => updateDraft("title", e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.preventDefault();
            }}
            required
            className="field-sizing-content min-h-9 resize-none"
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="meeting_date">Date</Label>
            <Input
              id="meeting_date"
              type="date"
              value={draft.meeting_date ?? ""}
              onChange={(e) => updateDraft("meeting_date", e.target.value || undefined)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="participants">Participants</Label>
            <Textarea
              id="participants"
              rows={1}
              placeholder="Comma separated"
              value={participantsText}
              onChange={(e) => setParticipantsText(e.target.value)}
              className="field-sizing-content min-h-9 resize-none"
            />
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-1.5">
        <Label htmlFor="summary">Summary</Label>
        <Textarea
          id="summary"
          rows={3}
          value={draft.summary}
          onChange={(e) => updateDraft("summary", e.target.value)}
        />
      </section>

      <StringListSection
        title="Decisions"
        items={draft.decisions}
        onChange={(items) => updateDraft("decisions", items)}
        placeholder="A decision that was made"
        addLabel="Add decision"
      />

      <StringListSection
        title="Blockers"
        items={draft.blockers}
        onChange={(items) => updateDraft("blockers", items)}
        placeholder="A blocker or open question"
        addLabel="Add blocker"
      />

      <ActionItemsSection
        items={draft.action_items}
        onChange={(items) => updateDraft("action_items", items)}
      />

      <section className="flex flex-col gap-1.5">
        <Label htmlFor="followup_email">Follow-up email</Label>
        <Textarea
          id="followup_email"
          rows={8}
          value={draft.followup_email}
          onChange={(e) => updateDraft("followup_email", e.target.value)}
        />
      </section>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onStartOver} disabled={saving}>
          Start over
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save meeting"}
        </Button>
      </div>
    </form>
  );
}

function StringListSection({
  title,
  items,
  onChange,
  placeholder,
  addLabel,
}: {
  title: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
  addLabel: string;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xs font-medium text-[var(--ink-700)]">{title}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-[var(--ink-500)]">None.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <Textarea
                rows={1}
                value={item}
                onChange={(e) => onChange(items.map((v, i) => (i === idx ? e.target.value : v)))}
                placeholder={placeholder}
                className="field-sizing-content min-h-9 resize-none"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onChange(items.filter((_, i) => i !== idx))}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
      <div>
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...items, ""])}>
          {addLabel}
        </Button>
      </div>
    </section>
  );
}

function ActionItemsSection({
  items,
  onChange,
}: {
  items: ActionItemDraft[];
  onChange: (items: ActionItemDraft[]) => void;
}) {
  function update(idx: number, patch: Partial<ActionItemDraft>) {
    onChange(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }
  function remove(idx: number) {
    onChange(items.filter((_, i) => i !== idx));
  }
  function add() {
    onChange([...items, { content: "", owner: null, due_hint: null }]);
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xs font-medium text-[var(--ink-700)]">Action items</h2>
      {items.length === 0 ? (
        <p className="text-sm text-[var(--ink-500)]">None.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item, idx) => (
            <li key={idx} className="rounded-lg border border-[var(--border)] bg-[var(--ink-050)] p-3">
              <div className="flex flex-col gap-2">
                <Textarea
                  rows={1}
                  value={item.content}
                  onChange={(e) => update(idx, { content: e.target.value })}
                  placeholder="What needs to happen"
                  required
                  className="field-sizing-content min-h-9 resize-none"
                />
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
                  <Input
                    value={item.owner ?? ""}
                    onChange={(e) => update(idx, { owner: e.target.value || null })}
                    placeholder="Owner (optional)"
                  />
                  <Input
                    value={item.due_hint ?? ""}
                    onChange={(e) => update(idx, { due_hint: e.target.value || null })}
                    placeholder="When (e.g. by Friday)"
                  />
                  <Button type="button" variant="ghost" size="sm" onClick={() => remove(idx)}>
                    Remove
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div>
        <Button type="button" variant="outline" size="sm" onClick={add}>
          Add action item
        </Button>
      </div>
    </section>
  );
}
