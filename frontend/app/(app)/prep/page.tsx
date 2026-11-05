import { PageHeader } from "@/components/shared/PageHeader";
import { InterviewPrep } from "@/features/interview/PrepView";

// Signed-in pages render client-side behind the auth gate (see the (app) layout).
export const instant = false;

export default function PrepPage() {
  return (
    <>
      <PageHeader
        eyebrow="Interview prep"
        accent="lavender"
        title="Your interview command center."
        description="A day-by-day plan with a source label on every question. Practice material is never presented as what a company asks."
      />
      <InterviewPrep />
    </>
  );
}
