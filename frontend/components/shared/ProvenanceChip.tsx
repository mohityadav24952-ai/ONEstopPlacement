import { Check, FileText, Info, Pencil, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import type { BadgeTone } from "@/components/ui/Badge";

export type Provenance =
  | "platform_verified"
  | "user_confirmed"
  | "user_entered"
  | "from_resume"
  | "ai_suggestion"
  | "unverified";

const config: Record<
  Provenance,
  { label: string; tone: BadgeTone; Icon: LucideIcon }
> = {
  platform_verified: { label: "Verified", tone: "ok", Icon: Check },
  user_confirmed: { label: "You confirmed", tone: "ok", Icon: Check },
  user_entered: { label: "You entered", tone: "neutral", Icon: Pencil },
  from_resume: { label: "From resume", tone: "data", Icon: FileText },
  ai_suggestion: { label: "AI suggestion", tone: "ai", Icon: Sparkles },
  unverified: { label: "Unverified", tone: "warn", Icon: Info },
};

export function ProvenanceChip({ kind }: { kind: Provenance }) {
  const { label, tone, Icon } = config[kind];
  return (
    <Badge tone={tone}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {label}
    </Badge>
  );
}