import { NewMeetingForm } from "./new-meeting-form";

export default function NewMeetingPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight">New debrief</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Paste a transcript or notes. We&apos;ll extract decisions, action items, and a follow-up
        email.
      </p>
      <div className="mt-8">
        <NewMeetingForm />
      </div>
    </div>
  );
}
