import { PageHeader } from "@/components/shared/PageHeader";
import { ProfileView } from "@/features/profile/ProfileView";

// Signed-in pages render client-side behind the auth gate (see the (app) layout).
export const instant = false;

export default function ProfilePage() {
  return (
    <>
      <PageHeader
        eyebrow="Profile"
        accent="orange"
        title="The facts every module relies on."
        description="Private to you. Resumes, plans and portfolios are built only from what you confirm here, and nothing is published without your approval."
      />
      <ProfileView />
    </>
  );
}
