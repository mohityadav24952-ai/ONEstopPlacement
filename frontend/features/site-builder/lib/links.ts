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

/**
 * Cover image for a project card, using free services only (no API key, no cost):
 *   1. an image the owner set (or that "Sync" found) is always used first;
 *   2. a project with a live site gets a screenshot of it from thum.io;
 *   3. anything else gets a clean dark placeholder with the project name from placehold.co.
 * Cards keep their own banner as the fallback if the image fails to load.
 */
export function projectCover(p: { title?: string; imageUrl?: string | null; liveUrl?: string | null }): string {
  const real = projectImage(p);
  if (real) return real;
  const label = (p.title || "Project").trim().slice(0, 40) || "Project";
  return `https://placehold.co/600x400/1a1a1a/FFFFFF/png?text=${encodeURIComponent(label).replace(/%20/g, "+")}`;
}

/** A real picture of the project (the owner's image, else a free screenshot of the live site), or
 * undefined when there is none, so a template can draw its own cover instead of a placeholder. */
export function projectImage(p: { imageUrl?: string | null; liveUrl?: string | null }): string | undefined {
  const own = safeHref(p.imageUrl);
  if (own) return own;
  const live = safeHref(p.liveUrl);
  return live ? `https://image.thum.io/get/width/600/crop/800/${live}` : undefined;
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

/**
 * The public address of this app, with no trailing slash. Set NEXT_PUBLIC_BASE_URL (for example
 * https://my-app.vercel.app) on the host and every portfolio link becomes the real, shareable one.
 * Without it the address the page is open on is used, so local development needs no setup and no
 * link ever contains a hardcoded host. Only http(s) values are accepted.
 */
export function siteBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  if (raw) {
    try {
      const u = new URL(raw);
      if (u.protocol === "http:" || u.protocol === "https:") return u.origin + u.pathname.replace(/\/+$/, "");
    } catch {
      // malformed value: fall back to the current address rather than producing a broken link
    }
  }
  return typeof window !== "undefined" ? window.location.origin : "";
}

export function publicUrl(handle: string): string {
  return `${siteBaseUrl()}/p/${handle}`;
}
