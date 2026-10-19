import Link from "next/link";
import { FolderOpen } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/shared/EmptyState";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg items-center px-6">
      <EmptyState
        className="w-full"
        icon={FolderOpen}
        title="Page not found"
        description="That address doesn't exist. Check the link, or head back to your workspace."
        action={
          <Link href="/" className={buttonClasses()}>
            Go to Home
          </Link>
        }
      />
    </main>
  );
}
