"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/shared/ErrorState";
import { useAuth } from "@/components/auth/AuthProvider";

export function AuthGate({ children }: { children: ReactNode }) {
  const { session, loading, configError } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !session && !configError) {
      router.replace("/login");
    }
  }, [loading, session, configError, router]);

  if (configError) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16">
        <ErrorState title="Sign-in is not configured" message={configError} />
      </div>
    );
  }

  if (loading || !session) {
    return (
      <div role="status" className="mx-auto max-w-3xl space-y-4 px-6 py-16">
        <span className="sr-only">Checking your session</span>
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return <>{children}</>;
}
