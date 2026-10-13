import { Download, Plus } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function DesignPreviewPage() {
  return (
    <main className="mx-auto max-w-4xl space-y-6 px-6 py-10">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-data">
          Dev only
        </p>
        <h1 className="font-display mt-1 text-3xl font-bold">Design system</h1>
        <p className="mt-2 text-muted">
          Preview of reusable components. This page is temporary.
        </p>
      </div>

      <Card title="Buttons" description="Variants, sizes and states">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button size="sm">Small</Button>
          <Button>
            <Plus className="h-4 w-4" aria-hidden="true" />
            With icon
          </Button>
          <Button loading>Loading</Button>
          <Button disabled>Disabled</Button>
        </div>
      </Card>

      <Card title="Badges" description="Status colours keep their meaning">
        <div className="flex flex-wrap gap-2">
          <Badge>Neutral</Badge>
          <Badge tone="primary">Primary</Badge>
          <Badge tone="data">Data</Badge>
          <Badge tone="ai">AI suggestion</Badge>
          <Badge tone="ok">Verified</Badge>
          <Badge tone="warn">Stale</Badge>
          <Badge tone="err">Error</Badge>
        </div>
      </Card>

      <Card
        title="Card with an action"
        description="Header with a button on the right"
        action={
          <Button size="sm" variant="secondary">
            <Download className="h-4 w-4" aria-hidden="true" />
            Export
          </Button>
        }
      >
        <p className="text-sm text-muted">
          Card content goes here. Long titles shrink instead of overflowing.
        </p>
      </Card>
    </main>
  );
}
