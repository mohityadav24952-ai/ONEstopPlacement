import { ApiError, apiFetch } from "@/lib/api/client";

export type HealthResponse = {
  status: string;
  service: string;
  environment: string;
  version: string;
};

export type ApiHealthResult =
  | { kind: "ok"; health: HealthResponse }
  | { kind: "down"; code: string; message: string; requestId?: string };

export async function checkApi(): Promise<ApiHealthResult> {
  try {
    const health = await apiFetch<HealthResponse>("/health", {
      timeoutMs: 4000,
      cache: "no-store",
      auth: false,
    });
    return { kind: "ok", health };
  } catch (err) {
    if (err instanceof ApiError) {
      return {
        kind: "down",
        code: err.code,
        message: err.message,
        requestId: err.requestId,
      };
    }
    return { kind: "down", code: "UNKNOWN", message: "Unexpected error." };
  }
}
