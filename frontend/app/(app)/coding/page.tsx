import { Code2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";

export default function CodingPage() {
  return (
    <>
      <PageHeader
        title="Coding Dashboard"
        description="Your GitHub, LeetCode, CodeChef and HackerRank activity in one place."
      />
      <Card>
        <EmptyState
          icon={Code2}
          title="Not built yet"
          description="This module is built in Stages 12 to 16."
        />
      </Card>
    </>
  );
}
