import { User } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";

export default function ProfilePage() {
  return (
    <>
      <PageHeader
        title="Profile"
        description="The verified information every module uses."
      />
      <Card>
        <EmptyState
          icon={User}
          title="Not built yet"
          description="The shared profile is built in Stages 9 and 10."
        />
      </Card>
    </>
  );
}