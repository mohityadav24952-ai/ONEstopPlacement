"use client";

import { useCallback, useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/shared/EmptyState";
import { describeError } from "@/lib/api/errors";
import * as api from "@/lib/api/resume";
import type { VersionSummary } from "@/lib/api/resume";
import { DocumentsPanel } from "@/features/resume/DocumentsPanel";
import { TargetRolePanel } from "@/features/resume/TargetRolePanel";
import { VersionEditor } from "@/features/resume/VersionEditor";

export function ResumeStudio() {
  const [versions, setVersions] = useState<VersionSummary[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setVersions(await api.listVersions());
    } catch (err) {
      setError(describeError(err));
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function createGeneral() {
    try {
      const v = await api.createVersion();
      await load();
      setOpenId(v.id);
    } catch (err) {
      setError(describeError(err));
    }
  }

  return (
    <div className="space-y-6">
      <DocumentsPanel />
      <TargetRolePanel onDraft={(id) => { void load(); setOpenId(id); }} />

      <Card
        title="3. Your resumes"
        description="Drafts are editable. Approved versions are locked and can be downloaded as PDF."
        action={<button type="button" className="text-sm text-primary hover:underline" onClick={createGeneral}>New general draft</button>}
      >
        {error && <p role="alert" className="mb-3 text-sm text-err">{error}</p>}
        {versions && versions.length === 0 ? (
          <EmptyState title="No resumes yet" description="Add profile details, then create a draft from a job description or a general one." />
        ) : (
          <ul className="space-y-2">
            {versions?.map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-2 rounded-md border border-edge p-3">
                <button type="button" onClick={() => setOpenId(v.id)} className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-sm font-medium">{v.title}</span>
                  <span className="mt-1 flex flex-wrap gap-1">
                    <Badge tone={v.status === "APPROVED" ? "ok" : "warn"}>{v.status.toLowerCase()}</Badge>
                    {v.stale && <Badge tone="warn">profile changed</Badge>}
                    {v.status === "DRAFT" && v.unresolved_flags > 0 && <Badge tone="err">{v.unresolved_flags} to resolve</Badge>}
                  </span>
                </button>
                <button type="button" aria-label={`Delete ${v.title}`} className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-edge/40 hover:text-err"
                  onClick={async () => {
                    if (!window.confirm("Delete this resume version and its PDF?")) return;
                    try { await api.deleteVersion(v.id); if (openId === v.id) setOpenId(null); await load(); } catch (err) { setError(describeError(err)); }
                  }}>
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {openId && <VersionEditor key={openId} id={openId} onChanged={() => void load()} />}
    </div>
  );
}
