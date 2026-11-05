import { AuthGate } from "@/components/auth/AuthGate";
import { PlaceyHost } from "@/components/placey/PlaceyHost";
import { PlaceyProvider } from "@/components/placey/PlaceyProvider";
import { MobileNav } from "@/components/shared/MobileNav";
import { Sidebar } from "@/components/shared/Sidebar";
import { TopBar } from "@/components/shared/TopBar";

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <AuthGate>
      <PlaceyProvider>
      <div className="min-h-screen">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-cobalt focus:px-3 focus:py-2 focus:text-sm focus:text-on-accent"
        >
          Skip to content
        </a>

        <Sidebar />

        <div className="lg:pl-64">
          <TopBar />
          {/* lg:pr-36 reserves a column on the right for Placey so it never covers page content */}
          <div className="lg:pr-36">
            <main id="main" className="mx-auto max-w-[1180px] px-4 py-8 pb-28 sm:px-8 lg:pb-14">
              {children}
            </main>
          </div>
        </div>

        <MobileNav />
        <PlaceyHost />
      </div>
      </PlaceyProvider>
    </AuthGate>
  );
}
