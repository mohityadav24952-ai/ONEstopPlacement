import { PageHeader } from "@/components/shared/PageHeader";
import { SiteStudio } from "@/features/site-builder/studio/SiteStudio";

// Signed-in pages render client-side behind the auth gate (see the (app) layout).
export const instant = false;

export default function PortfolioSitePage() {
  return (
    <>
      <PageHeader
        eyebrow="Portfolio website"
        accent="mint"
        title="Your own live portfolio site."
        description="Claim a handle, import your resume, pick a template and publish. It stays private until you publish it."
      />
      <SiteStudio />
    </>
  );
}
