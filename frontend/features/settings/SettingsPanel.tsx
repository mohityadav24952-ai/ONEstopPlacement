"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Download, Eye, Trash2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useFeedback } from "@/components/ui/Feedback";
import { useAuth } from "@/components/auth/AuthProvider";
import { describeError } from "@/lib/api/errors";
import { deleteAccount, exportMyData } from "@/lib/api/home";
import { cn } from "@/lib/cn";

const CONFIRM = "DELETE MY ACCOUNT";

function Row({ icon, title, description, children, danger }: { icon: ReactNode; title: string; description: string; children: ReactNode; danger?: boolean }) {
  return (
    <section
      className={cn(
        "animate-in grid gap-6 rounded-3xl border-2 p-6 md:grid-cols-[260px_1fr] md:p-8",
        danger ? "border-coral bg-coral/6" : "border-ink/15 bg-surface",
      )}
    >
      <div>
        <span className={cn("mb-3 flex h-11 w-11 items-center justify-center rounded-xl border-2 border-ink shadow-[3px_3px_0_var(--ink)]", danger ? "bg-coral text-white" : "bg-orange/30")}>
          {icon}
        </span>
        <h2 className="font-display text-xl font-semibold">{title}</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">{description}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

export function SettingsView() {
  const { user, signOut } = useAuth();
  const { toast, confirm } = useFeedback();
  const router = useRouter();
  const [busy, setBusy] = useState<"export" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onExport() {
    setBusy("export");
    setError(null);
    try {
      const data = await exportMyData();
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = "my-data.json";
      a.click();
      URL.revokeObjectURL(url);
      toast("Your data was downloaded as my-data.json.");
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(null);
    }
  }

  async function onDelete() {
    const ok = await confirm({
      title: "Delete your account?",
      message: "This permanently deletes your profile, uploads, resumes, prep plans, portfolios and exports. It cannot be undone. Backups may persist briefly at the hosting provider.",
      confirmLabel: "Delete everything",
      tone: "danger",
      typeToConfirm: CONFIRM,
    });
    if (!ok) return;
    setBusy("delete");
    setError(null);
    try {
      await deleteAccount(CONFIRM);
      await signOut();
      router.replace("/login");
    } catch (err) {
      setError(describeError(err));
      setBusy(null);
    }
  }

  const initial = (user?.email ?? "?").charAt(0).toUpperCase();

  return (
    <div className="space-y-6">
      <Row icon={<UserRound className="h-5 w-5" aria-hidden="true" />} title="Account" description="The identity you are signed in with.">
        <div className="flex items-center gap-4">
          <span className="font-display flex h-16 w-16 items-center justify-center rounded-full border-2 border-ink bg-orange text-2xl font-bold shadow-[3px_3px_0_var(--ink)]">{initial}</span>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">Signed in as</p>
            <p className="truncate font-display text-xl font-semibold">{user?.email ?? "Unknown"}</p>
          </div>
        </div>
      </Row>

      <Row icon={<Download className="h-5 w-5" aria-hidden="true" />} title="Your data" description="Take a copy of everything you entered, any time.">
        <p className="mb-4 text-sm leading-relaxed text-muted">Downloads a JSON file with your profile, coding stats, resume versions and portfolio content. Uploaded files are not included. Limited to a few exports per hour.</p>
        <Button variant="secondary" loading={busy === "export"} onClick={onExport}>
          <Download className="h-4 w-4" aria-hidden="true" /> Export my data
        </Button>
      </Row>

      <Row icon={<Eye className="h-5 w-5" aria-hidden="true" />} title="Privacy" description="What this app does with your information.">
        <ul className="space-y-3 text-sm leading-relaxed">
          {[
            ["Private by default", "Everything is tied to your account. Other users cannot see it, even by guessing a link."],
            ["Nothing is published for you", "Portfolios are exported as a file you publish yourself, after you review exactly what becomes public."],
            ["AI use is limited", "Resume text or job descriptions are sent to the AI service only when you press Parse, Analyse or Generate. Results are suggestions you approve."],
            ["Logs stay clean", "We record that an AI call happened (counts and timing), never your resume text or prompts."],
          ].map(([t, d]) => (
            <li key={t} className="flex gap-3">
              <span aria-hidden="true" className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-mint" />
              <span><strong className="font-bold">{t}.</strong> <span className="text-muted">{d}</span></span>
            </li>
          ))}
        </ul>
      </Row>

      <Row danger icon={<Trash2 className="h-5 w-5" aria-hidden="true" />} title="Delete account" description="Permanent. There is no undo.">
        <p className="mb-4 text-sm leading-relaxed text-muted">Removes your profile, uploaded files, resumes and PDFs, prep plans, portfolios and exports from this app. You will be asked to type a confirmation phrase.</p>
        <Button variant="danger" loading={busy === "delete"} onClick={onDelete}>Delete my account</Button>
      </Row>

      {error && <p role="alert" className="text-sm font-medium text-coral">{error}</p>}
    </div>
  );
}
