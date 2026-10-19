"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/shared/ErrorState";
import { ApiError, apiFetch } from "@/lib/api/client";

type Outcome =
  | { kind: "idle" }
  | { kind: "ok"; text: string }
  | { kind: "error"; error: ApiError };

export function ApiErrorDemo() {
  const [outcome, setOutcome] = useState<Outcome>({ kind: "idle" });
  const [busy, setBusy] = useState(false);

  async function run(path: string) {
    setBusy(true);
    setOutcome({ kind: "idle" });
    try {
      const data = await apiFetch<unknown>(path);
      setOutcome({ kind: "ok", text: JSON.stringify(data) });
    } catch (err) {
      const error =
        err instanceof ApiError
          ? err
          : new ApiError("UNKNOWN", "Unexpected error.", 0);
      setOutcome({ kind: "error", error });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          disabled={busy}
          onClick={() => run("/dev/limit?n=5")}
        >
          Success
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={busy}
          onClick={() => run("/dev/limit?n=abc")}
        >
          Validation error
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={busy}
          onClick={() => run("/dev/conflict")}
        >
          App error
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={busy}
          onClick={() => run("/dev/boom")}
        >
          Server crash
        </Button>
      </div>

      {outcome.kind === "ok" && (
        <p className="font-mono text-sm text-ok">Response: {outcome.text}</p>
      )}
      {outcome.kind === "error" && (
        <ErrorState
          title={outcome.error.code}
          message={outcome.error.message}
          referenceId={outcome.error.requestId}
        />
      )}
    </div>
  );
}
