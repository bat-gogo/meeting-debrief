import { NewMeetingForm } from "./new-meeting-form";

export default function NewMeetingPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10 md:px-8">
      <h1
        className="font-display text-[2.125rem] font-medium tracking-tight text-[var(--ink-900)]"
        style={{ fontVariationSettings: '"opsz" 60' }}
      >
        New debrief
      </h1>
      <p className="mt-1.5 text-sm text-[var(--ink-500)]">
        Paste a transcript or notes. We&apos;ll extract decisions, action items, and a follow-up
        email.
      </p>
      <div className="mt-8">
        <NewMeetingForm />
      </div>
    </div>
  );
}
