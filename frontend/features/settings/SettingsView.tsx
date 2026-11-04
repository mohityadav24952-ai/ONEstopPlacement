"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/components/auth/AuthProvider";
import { describeError } from "@/lib/api/errors";
import { deleteAccount, exportMyData } from "@/lib/api/home";

const CONFIRM = "DELETE MY ACCOUNT";

export function SettingsView() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typed, setTyped] = useState("");

  async function onExport() {
    setBusy(true);
    setError(null);
    try {
      const data = await exportMyData();
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = "my-data.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    setBusy(true);
    setError(null);
    try {
      await deleteAccount(typed);
      await signOut();
      router.replace("/login");
    } catch (err) {
      setError(describeError(err));
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card title="Account"><p className="text-sm">Signed in as <strong>{user?.email}</strong></p></Card>

      <Card title="Your data" description="Download everything you entered as a JSON file. Uploaded files are not included.">
        <Button variant="secondary" loading={busy} onClick={onExport}>Export my data</Button>
      </Card>

      <Card title="Delete account" description="Permanently deletes your profile, uploads, resumes, plans, portfolios and exports. This cannot be undone. Backups may persist for a short time at the hosting provider.">
        <div className="space-y-3">
          <label htmlFor="del-confirm" className="block text-sm font-medium">Type {CONFIRM} to confirm</label>
          <input id="del-confirm" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" className="field max-w-sm" />
          <div><Button variant="danger" disabled={typed !== CONFIRM} loading={busy} onClick={onDelete}>Delete my account</Button></div>
        </div>
      </Card>

      {error && <p role="alert" className="text-sm text-err">{error}</p>}
    </div>
  );
}
