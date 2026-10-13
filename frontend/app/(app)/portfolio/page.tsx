import { Globe } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";

export default function PortfolioPage() {
  return (
    <>
      <PageHeader
        title="Portfolio Builder"
        description="Generate a portfolio website from your approved profile and projects."
      />
      <Card>
        <EmptyState
          icon={Globe}
          title="Not built yet"
          description="This module is built in Stages 28 to 33."
        />
      </Card>
    </>
  );
}