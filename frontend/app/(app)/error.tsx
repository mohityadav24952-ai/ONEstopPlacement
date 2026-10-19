"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/shared/ErrorState";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorState
      message="This page ran into an unexpected problem. Your saved data is not affected."
      hint="Try again. If it keeps happening, go back to Home."
      referenceId={error.digest}
      action={<Button onClick={reset}>Try again</Button>}
    />
  );
}
