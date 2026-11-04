import { PageHeader } from "@/components/shared/PageHeader";
import { HomeView } from "@/features/home/HomeView";

export default function HomePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Welcome to ONEstopPlacement"
        description="One workspace for your coding profile, resume, interview preparation and portfolio, all built from facts you approve."
      />
      <HomeView />
    </div>
  );
}
