import { PageHeader } from "@/components/shared/PageHeader";
import { CodingDashboard } from "@/features/coding/CodingView";

export default function CodingPage() {
  return (
    <>
      <PageHeader
        eyebrow="Coding dashboard"
        accent="cobalt"
        title="Everything you have built, in one view."
        description="Your repositories, languages and platform stats, each with its source and freshness. Missing data is shown as not available, never as zero."
      />
      <CodingDashboard />
    </>
  );
}
