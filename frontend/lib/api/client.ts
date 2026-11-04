import { getAccessToken } from "@/lib/auth/supabase";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const DEFAULT_TIMEOUT_MS = 8000;

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly requestId?: string;
  readonly details?: unknown;

  constructor(
    code: string,
    message: string,
    status: number,
    requestId?: string,
    details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.requestId = requestId;
    this.details = details;
  }
}

type ErrorEnvelope = {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
    request_id?: string | null;
  };
};

type ApiFetchInit = Omit<RequestInit, "signal"> & {
  timeoutMs?: number;
  /** Attach the signed-in user's token. Defaults to true. */
  auth?: boolean;
};

export async function apiFetch<T>(
  path: string,
  init: ApiFetchInit = {},
): Promise<T> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, auth = true, ...rest } = init;

  const headers = new Headers(rest.headers);
  headers.set("Accept", "application/json");

  if (auth) {
    const token = await getAccessToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...rest,
      headers,
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError("TIMEOUT", "The server took too long to respond.", 0);
    }
    throw new ApiError("NETWORK_ERROR", "Could not reach the server.", 0);
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    let envelope: ErrorEnvelope = {};
    try {
      envelope = (await response.json()) as ErrorEnvelope;
    } catch {
      // The body was not JSON. Fall back to generic values below.
    }
    const e = envelope.error;
    throw new ApiError(
      e?.code ?? "HTTP_ERROR",
      e?.message ?? `Request failed (${response.status}).`,
      response.status,
      e?.request_id ?? response.headers.get("x-request-id") ?? undefined,
      e?.details,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new ApiError(
      "INVALID_RESPONSE",
      "The server sent an unexpected response.",
      response.status,
    );
  }
}
