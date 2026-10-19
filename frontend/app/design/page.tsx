import { Download, FolderOpen, Plus } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { ProvenanceChip } from "@/components/shared/ProvenanceChip";
import type { Provenance } from "@/components/shared/ProvenanceChip";

import { ApiErrorDemo } from "./ApiErrorDemo";
const provenanceKinds: Provenance[] = [
  "platform_verified",
  "user_confirmed",
  "user_entered",
  "from_resume",
  "ai_suggestion",
  "unverified",
];

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
        title="Provenance chips"
        description="Shows where information came from. Facts and suggestions must look different."
      >
        <div className="flex flex-wrap gap-2">
          {provenanceKinds.map((kind) => (
            <ProvenanceChip key={kind} kind={kind} />
          ))}
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

      <Card
        title="Loading state"
        description="Skeletons keep the layout stable"
      >
        <div className="space-y-3">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-24 w-full" />
        </div>
      </Card>

      <Card title="Empty state">
        <EmptyState
          icon={FolderOpen}
          title="No platforms connected"
          description="Add your GitHub username to see your repositories and activity here."
          action={
            <Button>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Connect GitHub
            </Button>
          }
        />
      </Card>

      <Card title="Error state">
        <ErrorState
          title="Could not refresh GitHub"
          message="GitHub did not respond in time."
          hint="Your last saved data is still shown. You can try again, or enter your details manually."
          referenceId="req_demo_1234"
          action={<Button variant="secondary">Try again</Button>}
        />
      </Card>

      <Card
        title="API errors (dev)"
        description="Calls the backend's test routes. Start the backend first."
      >
        <ApiErrorDemo />
      </Card>
    </main>
  );
}
