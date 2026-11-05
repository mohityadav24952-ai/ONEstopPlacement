import { HomeDashboard } from "@/features/home/HomeDashboard";

// Signed-in pages render client-side behind the auth gate (see the (app) layout).
export const instant = false;

export default function HomePage() {
  return <HomeDashboard />;
}
