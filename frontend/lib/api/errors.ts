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
