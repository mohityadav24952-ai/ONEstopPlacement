import { Settings } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Settings"
        description="Account, connected platforms, privacy and data controls."
      />
      <Card>
        <EmptyState
          icon={Settings}
          title="Not built yet"
          description="Settings arrive alongside authentication and profile stages."
        />
      </Card>
    </>
  );
}
