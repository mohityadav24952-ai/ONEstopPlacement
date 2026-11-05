import { PageHeader } from "@/components/shared/PageHeader";
import { ResumeStudio } from "@/features/resume/ResumeStudio";

// Signed-in pages render client-side behind the auth gate (see the (app) layout).
export const instant = false;

export default function ResumePage() {
  return (
    <>
      <PageHeader
        eyebrow="Resume studio"
        accent="coral"
        title="A resume that tells the truth, tailored."
        description="Match a job description against your profile, review every suggested change, and approve a version you can stand behind."
      />
      <ResumeStudio />
    </>
  );
}
