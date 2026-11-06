import { PageHeader } from "@/components/shared/PageHeader";
import { SettingsView } from "@/features/settings/SettingsPanel";

// Signed-in pages render client-side behind the auth gate (see the (app) layout).
export const instant = false;

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Settings"
        accent="ink"
        title="Your account, your data."
        description="Tune how the app looks, export what you have entered, review how your information is used, or delete everything."
      />
      <SettingsView />
    </>
  );
}
