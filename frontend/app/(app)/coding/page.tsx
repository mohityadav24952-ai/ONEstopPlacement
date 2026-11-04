import { PageHeader } from "@/components/shared/PageHeader";
import { CodingDashboard } from "@/features/coding/CodingDashboard";

export default function CodingPage() {
  return (
    <>
      <PageHeader
        title="Coding Dashboard"
        description="Your coding activity with its source and freshness. Missing data is shown as not available, never as zero."
      />
      <CodingDashboard />
    </>
  );
}
