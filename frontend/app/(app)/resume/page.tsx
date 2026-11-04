import { PageHeader } from "@/components/shared/PageHeader";
import { ResumeStudio } from "@/features/resume/ResumeStudio";

export default function ResumePage() {
  return (
    <>
      <PageHeader
        title="Resume Studio"
        description="Tailor your resume to a role using only facts from your profile. Nothing is added to your resume without your approval."
      />
      <ResumeStudio />
    </>
  );
}
