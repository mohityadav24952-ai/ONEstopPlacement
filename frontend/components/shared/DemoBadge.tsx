import { FlaskConical } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

export function DemoBadge() {
  return (
    <Badge
      tone="warn"
      title="Sample content for layout preview. Not your data."
    >
      <FlaskConical className="h-3 w-3" aria-hidden="true" />
      Demo data
    </Badge>
  );
}
