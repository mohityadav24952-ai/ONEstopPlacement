import { PageHeader } from "@/components/shared/PageHeader";
import { PortfolioBuilder } from "@/features/portfolio/PortfolioBuilder";

export default function PortfolioPage() {
  return (
    <>
      <PageHeader
        title="Portfolio Builder"
        description="Generate a static portfolio site from your approved profile. You review exactly what becomes public before anything can be exported."
      />
      <PortfolioBuilder />
    </>
  );
}
