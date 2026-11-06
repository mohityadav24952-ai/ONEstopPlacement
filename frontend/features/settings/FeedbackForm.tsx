"use client";

import { useId, useState } from "react";
import { Bug, MessageSquareHeart, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useFeedback } from "@/components/ui/Feedback";
import { describeError } from "@/lib/api/errors";
import { submitFeedback } from "@/lib/api/feedback";
import type { FeedbackKind } from "@/lib/api/feedback";
import { cn } from "@/lib/cn";

const MIN = 10;
const MAX = 4000;

const KINDS: { id: FeedbackKind; label: string; Icon: typeof Bug; placeholder: string }[] = [
  { id: "feedback", label: "Feedback", Icon: MessageSquareHeart, placeholder: "What do you like, and what would make the app more useful?" },
  { id: "bug", label: "Report a bug", Icon: Bug, placeholder: "What happened, what did you expect, and which page were you on?" },
];

/** Sends feedback or a bug report to the team. Saved with your account; replies go to your sign-in email. */
export function FeedbackForm() {
  const { toast } = useFeedback();
  const textId = useId();
  const hintId = useId();
  const [kind, setKind] = useState<FeedbackKind>("feedback");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const length = text.trim().length;
  const tooShort = length < MIN;
  const current = KINDS.find((k) => k.id === kind) ?? KINDS[0];

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (tooShort || busy) return;
    setBusy(true);
    setError(null);
    try {
      await submitFeedback(kind, text.trim(), window.location.pathname);
      setText("");
      toast(kind === "bug" ? "Bug report sent. Thank you for helping fix it!" : "Feedback sent. Thank you!");
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div role="radiogroup" aria-label="Type of message" className="inline-flex flex-wrap gap-1 rounded-full border border-edge-strong p-1">
        {KINDS.map(({ id, label, Icon }) => (
          <button key={id} type="button" role="radio" aria-checked={kind === id} onClick={() => setKind(id)}
            className={cn("inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-bold transition-colors",
              kind === id ? "bg-primary text-on-primary" : "text-muted hover:text-fg")}>
            <Icon className="h-4 w-4" aria-hidden="true" /> {label}
          </button>
        ))}
      </div>

      <div>
        <label htmlFor={textId} className="mb-1.5 block text-sm font-semibold">
          {kind === "bug" ? "Describe the bug" : "Your feedback"}
        </label>
        <textarea id={textId} rows={5} maxLength={MAX} value={text} onChange={(e) => setText(e.target.value)}
          placeholder={current.placeholder} aria-describedby={hintId} aria-invalid={error ? true : undefined}
          className="field w-full resize-y" />
        <p id={hintId} className="mt-1.5 flex flex-wrap justify-between gap-2 text-xs text-muted">
          <span>{tooShort ? `At least ${MIN} characters.` : "Sent with your sign-in email so we can reply."}</span>
          <span className="tabular-nums">{text.length}/{MAX}</span>
        </p>
      </div>

      {error && <p role="alert" className="text-sm font-medium text-coral">{error}</p>}

      <Button type="submit" loading={busy} disabled={tooShort}>
        <Send className="h-4 w-4" aria-hidden="true" /> {kind === "bug" ? "Send bug report" : "Send feedback"}
      </Button>
    </form>
  );
}
