import { ApiError } from "@/lib/api/client";

/** A short, user-safe message for any thrown value. */
export function describeError(err: unknown): string {
  if (err instanceof ApiError) {
    const fields = (err.details as { fields?: { field: string; message: string }[] } | undefined)?.fields;
    if (fields?.length) {
      return `${err.message} ${fields.map((f) => `${f.field}: ${f.message}`).join("; ")}`;
    }
    return err.message;
  }
  return "Something went wrong.";
}

/** A rejected request the user can correct (400-499), not auth, timeout, rate-limit or server trouble. */
export function isUserFixable(err: unknown): boolean {
  return err instanceof ApiError && err.status >= 400 && err.status < 500 && ![401, 403, 408, 429].includes(err.status);
}
