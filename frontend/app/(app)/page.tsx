import { HomeView } from "@/features/home/HomeView";

// Signed-in pages render client-side behind the auth gate (see the (app) layout).
export const instant = false;

export default function HomePage() {
  return <HomeView />;
}
