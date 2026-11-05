import type { ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-[0.65rem] font-semibold transition-all duration-150 " +
  "disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:active:translate-y-0";

// Primary and danger are tactile: a hard bottom edge that presses in when clicked.
const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-cobalt text-on-primary shadow-[0_3px_0_0_color-mix(in_srgb,var(--primary)_55%,black)] hover:-translate-y-px hover:brightness-110 active:translate-y-[2px] active:shadow-[0_1px_0_0_color-mix(in_srgb,var(--primary)_55%,black)]",
  secondary:
    "border-[1.5px] border-ink/80 bg-surface text-fg shadow-[0_2px_0_0_var(--ink)] hover:-translate-y-px hover:bg-surface-2 active:translate-y-[1px] active:shadow-[0_1px_0_0_var(--ink)]",
  ghost: "text-muted hover:bg-ink/6 hover:text-fg",
  danger:
    "bg-coral text-white shadow-[0_3px_0_0_color-mix(in_srgb,var(--coral)_55%,black)] hover:-translate-y-px hover:brightness-105 active:translate-y-[2px] active:shadow-[0_1px_0_0_color-mix(in_srgb,var(--coral)_55%,black)]",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3.5 text-[13px]",
  md: "h-10 px-5 text-sm",
};

export function buttonClasses({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}): string {
  return cn(base, variants[variant], sizes[size], className);
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses({ variant, size, className })}
      {...rest}
    >
      {loading && (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      )}
      {children}
    </button>
  );
}
