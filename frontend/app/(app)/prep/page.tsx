import { GraduationCap } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";

export default function PrepPage() {
  return (
    <>
      <PageHeader
        title="Interview Prep"
        description="Company- and role-specific preparation with clearly labelled question sources."
      />
      <Card>
        <EmptyState
          icon={GraduationCap}
          title="Not built yet"
          description="This module is built in Stages 24 to 27."
        />
      </Card>
    </>
  );
}