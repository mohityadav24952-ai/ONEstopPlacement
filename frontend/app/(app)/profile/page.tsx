import { PageHeader } from "@/components/shared/PageHeader";
import { ProfileView } from "@/features/profile/ProfileView";

export default function ProfilePage() {
  return (
    <>
      <PageHeader
        title="Profile"
        description="The information every module uses. Private to you; nothing is published without your approval."
      />
      <ProfileView />
    </>
  );
}
