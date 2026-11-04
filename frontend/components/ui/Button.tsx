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
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-150 " +
  "active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-brand text-on-primary shadow-lg shadow-primary/25 hover:brightness-110 hover:shadow-primary/40",
  secondary:
    "border border-edge bg-surface-2/70 text-fg hover:border-primary/50 hover:bg-surface-2",
  ghost: "text-muted hover:bg-surface-2 hover:text-fg",
  danger: "bg-err text-white shadow-lg shadow-err/20 hover:brightness-110",
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
