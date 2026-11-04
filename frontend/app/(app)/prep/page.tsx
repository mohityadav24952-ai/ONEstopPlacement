import { PageHeader } from "@/components/shared/PageHeader";
import { InterviewPrep } from "@/features/interview/InterviewPrep";

export default function PrepPage() {
  return (
    <>
      <PageHeader
        title="Interview Prep"
        description="A day-by-day plan with a source label on every question. Practice material is never presented as what a company asks."
      />
      <InterviewPrep />
    </>
  );
}
