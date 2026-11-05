"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LayoutDashboard, LayoutTemplate, Palette, PenLine, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useFeedback } from "@/components/ui/Feedback";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/shared/ErrorState";
import { ApiError } from "@/lib/api/client";
import { describeError } from "@/lib/api/errors";
import * as api from "@/lib/api/site";
import type { PortfolioConfig, PortfolioData } from "@/types/portfolio";
import { ClaimHandleView } from "@/features/site-builder/studio/ClaimHandleView";
import { CustomizeTab } from "@/features/site-builder/studio/CustomizeTab";
import { DashboardTab } from "@/features/site-builder/studio/DashboardTab";
import { EditDataTab } from "@/features/site-builder/studio/EditDataTab";
import { TemplatesTab } from "@/features/site-builder/studio/TemplatesTab";
import { cn } from "@/lib/cn";

const TABS = [
  ["dashboard", "Dashboard", LayoutDashboard],
  ["edit", "Edit Data", PenLine],
  ["customize", "Customize", Palette],
  ["templates", "Templates", LayoutTemplate],
] as const;
type Tab = (typeof TABS)[number][0];

type Load = { kind: "loading" } | { kind: "claim" } | { kind: "ready" } | { kind: "error"; message: string };

export function SiteStudio() {
  const { toast } = useFeedback();
  const [load, setLoad] = useState<Load>({ kind: "loading" });
  const [data, setData] = useState<PortfolioData | null>(null);
  const [tab, setTab] = useState<Tab>("dashboard");
  const dataRef = useRef<PortfolioData | null>(null);
  const uploadRef = useRef<(() => void) | null>(null);

  const put = useCallback((next: PortfolioData | null) => {
    dataRef.current = next;
    setData(next);
  }, []);

  const refresh = useCallback(async () => {
    try {
      put(await api.getMyPortfolio());
      setLoad({ kind: "ready" });
    } catch (err) {
      if (err instanceof ApiError && err.code === "NO_PORTFOLIO") setLoad({ kind: "claim" });
      else setLoad({ kind: "error", message: describeError(err) });
    }
  }, [put]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  /** Visual choices apply instantly, then save. If saving fails the change is rolled back. */
  const commitConfig = useCallback(
    async (partial: Partial<PortfolioConfig>) => {
      const before = dataRef.current;
      if (!before) return;
      put({ ...before, config: { ...before.config, ...partial } });
      try {
        const saved = await api.saveMyPortfolio({ ...before, config: { ...before.config, ...partial } });
        put(saved);
      } catch (err) {
        put(before);
        toast(describeError(err), "error");
      }
    },
    [put, toast],
  );

  const saveDraft = useCallback(
    async (draft: PortfolioData): Promise<PortfolioData | null> => {
      try {
        const saved = await api.saveMyPortfolio(draft);
        put(saved);
        return saved;
      } catch (err) {
        toast(describeError(err), "error");
        return null;
      }
    },
    [put, toast],
  );

  if (load.kind === "loading") {
    return (
      <div role="status" className="space-y-4">
        <span className="sr-only">Loading your portfolio</span>
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }
  if (load.kind === "error") return <ErrorState title="Could not load your portfolio" message={load.message} action={<Button size="sm" onClick={() => { setLoad({ kind: "loading" }); void refresh(); }}>Try again</Button>} />;
  if (load.kind === "claim" || !data) {
    return <ClaimHandleView onClaimed={(d) => { put(d); setLoad({ kind: "ready" }); setTab("edit"); toast("Handle claimed. Import your resume or fill in your details."); }} />;
  }

  return (
    <div className="space-y-6">
      <div className="panel sticky top-[72px] z-20 flex flex-wrap items-center gap-3 rounded-2xl p-2.5 pl-4">
        <div className="min-w-0">
          <p className="text-sm font-bold leading-tight">OneStop Portfolio</p>
          <p className="truncate text-xs text-muted">{data.config.handle}.onestop.tech</p>
        </div>
        <nav aria-label="Portfolio studio" className="order-last flex w-full gap-1 overflow-x-auto sm:order-none sm:ml-auto sm:w-auto">
          {TABS.map(([id, label, Icon]) => (
            <button key={id} type="button" aria-current={tab === id ? "page" : undefined} onClick={() => setTab(id)}
              className={cn("relative inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-colors", tab === id ? "bg-primary text-on-primary shadow-card" : "text-muted hover:bg-surface-2 hover:text-fg")}>
              <Icon className="h-4 w-4" aria-hidden="true" /> {label}
            </button>
          ))}
        </nav>
        <Button size="sm" variant="secondary" onClick={() => { setTab("edit"); window.setTimeout(() => uploadRef.current?.(), 50); }}>
          <Upload className="h-4 w-4" aria-hidden="true" /> Upload Resume PDF
        </Button>
      </div>

      {tab === "dashboard" && <DashboardTab data={data} onConfig={commitConfig} />}
      {tab === "edit" && <EditDataTab data={data} onSave={saveDraft} onResult={(r) => put(r.data)} uploadRef={uploadRef} />}
      {tab === "customize" && <CustomizeTab data={data} onConfig={commitConfig} />}
      {tab === "templates" && <TemplatesTab data={data} onConfig={commitConfig} />}
    </div>
  );
}
