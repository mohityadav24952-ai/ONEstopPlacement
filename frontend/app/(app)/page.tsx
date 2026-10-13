import { LayoutDashboard } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";

export default function HomePage() {
  return (
    <>
      <PageHeader
        title="Home"
        description="Your career workspace. The overview dashboard is built in Stage 4."
      />
      <Card>
        <EmptyState
          icon={LayoutDashboard}
          title="Dashboard coming next"
          description="This is a placeholder. Use the navigation to visit each module page."
        />
      </Card>
    </>
  );
}