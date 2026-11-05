/** Only http(s) links are ever rendered as hrefs. User-provided data is shown on a public page. */
export function safeHref(url?: string | null): string | undefined {
  if (!url) return undefined;
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : undefined;
  } catch {
    return undefined;
  }
}

export function hostOf(url?: string | null): string {
  const href = safeHref(url);
  if (!href) return "";
  return new URL(href).hostname.replace(/^www\./, "");
}

export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "item";
}

export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || "this developer";
}

export function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] ?? "?").toUpperCase() + (parts.length > 1 ? parts[parts.length - 1][0].toUpperCase() : "");
}

export function publicUrl(handle: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/p/${handle}`;
}
