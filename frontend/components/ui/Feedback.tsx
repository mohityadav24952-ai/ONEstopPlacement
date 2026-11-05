"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

/* ------------------------------------------------------------------
   Toasts (success / error / info) and modal dialogs (confirm / prompt),
   replacing window.alert, window.confirm and window.prompt.
   ------------------------------------------------------------------ */

type ToastKind = "success" | "error" | "info";
type Toast = { id: number; kind: ToastKind; message: string };

export type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  /** "danger" colours the confirm button coral. */
  tone?: "danger" | "default";
  /** If set, the user must type this exact text before confirming. */
  typeToConfirm?: string;
};

export type PromptOptions = {
  title: string;
  label: string;
  confirmLabel?: string;
  minLength?: number;
};

type DialogState =
  | { kind: "confirm"; options: ConfirmOptions; resolve: (v: boolean) => void }
  | { kind: "prompt"; options: PromptOptions; resolve: (v: string | null) => void };

type FeedbackApi = {
  toast: (message: string, kind?: ToastKind) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  prompt: (options: PromptOptions) => Promise<string | null>;
};

const FeedbackContext = createContext<FeedbackApi | null>(null);

export function useFeedback(): FeedbackApi {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error("useFeedback must be used inside FeedbackProvider");
  return ctx;
}

const TOAST_STYLE: Record<ToastKind, { icon: typeof Info; bar: string; iconColor: string }> = {
  success: { icon: CheckCircle2, bar: "bg-mint", iconColor: "text-mint" },
  error: { icon: XCircle, bar: "bg-coral", iconColor: "text-coral" },
  info: { icon: Info, bar: "bg-cobalt", iconColor: "text-cobalt" },
};

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const toast = useCallback(
    (message: string, kind: ToastKind = "success") => {
      const id = nextId.current++;
      setToasts((t) => [...t.slice(-3), { id, kind, message }]);
      window.setTimeout(() => dismiss(id), kind === "error" ? 7000 : 4200);
    },
    [dismiss],
  );

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => setDialog({ kind: "confirm", options, resolve })),
    [],
  );
  const prompt = useCallback(
    (options: PromptOptions) =>
      new Promise<string | null>((resolve) => setDialog({ kind: "prompt", options, resolve })),
    [],
  );

  return (
    <FeedbackContext.Provider value={{ toast, confirm, prompt }}>
      {children}

      {/* Toast stack. aria-live announces new messages to screen readers. */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-20 right-4 z-[70] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2 lg:bottom-6 lg:right-6"
      >
        {toasts.map((t) => {
          const s = TOAST_STYLE[t.kind];
          const Icon = s.icon;
          return (
            <div
              key={t.id}
              role={t.kind === "error" ? "alert" : "status"}
              style={{ animation: "toast-in 0.25s ease-out both" }}
              className="pointer-events-auto relative flex items-start gap-3 overflow-hidden rounded-xl border-2 border-ink bg-surface py-3 pl-5 pr-3 shadow-[4px_4px_0_var(--ink)]"
            >
              <span aria-hidden="true" className={cn("absolute inset-y-0 left-0 w-1.5", s.bar)} />
              <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", s.iconColor)} aria-hidden="true" />
              <p className="flex-1 text-sm font-medium leading-snug">{t.message}</p>
              <button
                type="button"
                aria-label="Dismiss"
                onClick={() => dismiss(t.id)}
                className="rounded-md p-1 text-muted hover:bg-ink/8 hover:text-fg"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>

      {dialog && (
        <DialogView
          state={dialog}
          onClose={() => setDialog(null)}
        />
      )}
    </FeedbackContext.Provider>
  );
}

function DialogView({ state, onClose }: { state: DialogState; onClose: () => void }) {
  const [typed, setTyped] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const title = state.options.title;

  function finish(ok: boolean) {
    if (state.kind === "confirm") state.resolve(ok);
    else state.resolve(ok ? typed.trim() : null);
    onClose();
  }

  useEffect(() => {
    // Focus the field for prompts, or the safe button for confirms.
    (inputRef.current ?? confirmRef.current)?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") finish(false);
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
    // finish only closes over stable props for the lifetime of this dialog
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const needsTyping = state.kind === "confirm" && state.options.typeToConfirm;
  const minLen = state.kind === "prompt" ? (state.options.minLength ?? 1) : 0;
  const canConfirm =
    state.kind === "confirm"
      ? !needsTyping || typed === state.options.typeToConfirm
      : typed.trim().length >= minLen;
  const danger = state.kind === "confirm" && state.options.tone === "danger";

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center p-4 sm:items-center" style={{ animation: "fade-in 0.15s ease-out both" }}>
      <button type="button" aria-label="Close dialog" tabIndex={-1} onClick={() => finish(false)} className="absolute inset-0 cursor-default bg-ink/55 backdrop-blur-[2px]" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dlg-title"
        style={{ animation: "dialog-in 0.2s ease-out both" }}
        className="sticker relative w-full max-w-md rounded-2xl p-6"
      >
        <div className="flex items-start gap-3">
          <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-ink", danger ? "bg-coral text-white" : "bg-orange/30 text-ink")}>
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 id="dlg-title" className="font-display text-xl font-semibold">{title}</h2>
            {state.kind === "confirm" && state.options.message && (
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{state.options.message}</p>
            )}
          </div>
        </div>

        {(needsTyping || state.kind === "prompt") && (
          <div className="mt-5 space-y-1.5">
            <label htmlFor="dlg-input" className="text-sm font-semibold">
              {state.kind === "prompt" ? state.options.label : `Type ${state.kind === "confirm" ? state.options.typeToConfirm : ""} to confirm`}
            </label>
            <input
              id="dlg-input"
              ref={inputRef}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && canConfirm && finish(true)}
              autoComplete="off"
              className="field"
            />
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => finish(false)}>
            Cancel
          </Button>
          <ConfirmButton refEl={confirmRef} disabled={!canConfirm} danger={danger} onClick={() => finish(true)}>
            {state.options.confirmLabel ?? (danger ? "Delete" : "Confirm")}
          </ConfirmButton>
        </div>
      </div>
    </div>
  );
}

function ConfirmButton({
  refEl,
  disabled,
  danger,
  onClick,
  children,
}: {
  refEl: React.RefObject<HTMLButtonElement | null>;
  disabled: boolean;
  danger: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      ref={refEl}
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-[0.65rem] px-5 text-sm font-semibold text-white transition-all disabled:cursor-not-allowed disabled:opacity-50",
        danger
          ? "bg-coral shadow-[0_3px_0_0_color-mix(in_srgb,var(--coral)_55%,black)] enabled:hover:-translate-y-px enabled:active:translate-y-[2px] enabled:active:shadow-none"
          : "bg-cobalt text-on-primary shadow-[0_3px_0_0_color-mix(in_srgb,var(--primary)_55%,black)] enabled:hover:-translate-y-px enabled:active:translate-y-[2px] enabled:active:shadow-none",
      )}
    >
      {children}
    </button>
  );
}
