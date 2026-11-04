import { PageHeader } from "@/components/shared/PageHeader";
import { SettingsView } from "@/features/settings/SettingsView";

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" description="Your account, your data and privacy controls." />
      <SettingsView />
    </>
  );
}
