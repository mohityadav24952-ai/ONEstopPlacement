import { PageHeader } from "@/components/shared/PageHeader";
import { PortfolioBuilder } from "@/features/portfolio/PortfolioStudio";

// Signed-in pages render client-side behind the auth gate (see the (app) layout).
export const instant = false;

export default function PortfolioPage() {
  return (
    <>
      <PageHeader
        eyebrow="Portfolio builder"
        accent="mint"
        title="A portfolio you are proud to share."
        description="Generate a static site from your approved profile. You review exactly what becomes public before anything can be exported."
      />
      <PortfolioBuilder />
    </>
  );
}
