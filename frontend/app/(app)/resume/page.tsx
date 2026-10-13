import { FileText } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";

export default function ResumePage() {
  return (
    <>
      <PageHeader
        title="Resume Studio"
        description="Tailor your resume to a job description using only facts you can back up."
      />
      <Card>
        <EmptyState
          icon={FileText}
          title="Not built yet"
          description="This module is built in Stages 17 to 23."
        />
      </Card>
    </>
  );
}