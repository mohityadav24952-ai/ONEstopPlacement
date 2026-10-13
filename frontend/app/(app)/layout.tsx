import { MobileNav } from "@/components/shared/MobileNav";
import { Sidebar } from "@/components/shared/Sidebar";
import { TopBar } from "@/components/shared/TopBar";

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:text-app"
      >
        Skip to content
      </a>

      <Sidebar />

      <div className="lg:pl-64">
        <TopBar />
        <main
          id="main"
          className="mx-auto max-w-6xl px-4 py-6 pb-24 sm:px-6 lg:pb-10"
        >
          {children}
        </main>
      </div>

      <MobileNav />
    </div>
  );
}