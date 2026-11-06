import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicPortfolio } from "@/features/site-builder/PublicPortfolio";
import { defaultPortfolioData } from "@/features/site-builder/data/defaultPortfolioData";
import { siteBaseUrl } from "@/features/site-builder/lib/links";
import type { PortfolioData, TemplateId } from "@/types/portfolio";

// Public pages are rendered per request: every visit must see the latest published data (and count once).
export const instant = false;

// The backend address comes from the environment. The local default exists for development only, so a
// production deploy without it fails loudly (a 404 page) instead of quietly pointing at localhost.
const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? (process.env.NODE_ENV === "production" ? "" : "http://localhost:8000");
const SAMPLE_HANDLES = new Set(["demo", "flyingmohit"]);

type Loaded = { data: PortfolioData; sample: boolean } | null;

// One request per render: metadata and page share it, so a visit is counted once.
const load = cache(async (handle: string): Promise<Loaded> => {
  try {
    const res = await fetch(`${API}/api/v1/portfolio-site/public/${encodeURIComponent(handle)}`, { cache: "no-store" });
    if (res.ok) return { data: (await res.json()) as PortfolioData, sample: false };
  } catch {
    // backend offline: fall through to the sample for the demo handles only
  }
  if (SAMPLE_HANDLES.has(handle.toLowerCase())) {
    return { data: { ...defaultPortfolioData, config: { ...defaultPortfolioData.config, handle } }, sample: true };
  }
  return null;
});

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const { handle } = await params;
  const loaded = await load(handle);
  if (!loaded) return { title: "Portfolio not found", robots: { index: false } };
  const { basics } = loaded.data;
  const title = [basics.fullName, basics.headline].filter(Boolean).join(" | ") || handle;
  const base = siteBaseUrl(); // from NEXT_PUBLIC_BASE_URL; empty when it is not set, in which case relative URLs are used
  const path = `/p/${encodeURIComponent(handle)}`;
  return {
    title,
    description: basics.shortBio || undefined,
    robots: loaded.sample ? { index: false } : { index: true, follow: true },
    ...(base ? { metadataBase: new URL(base) } : {}),
    alternates: { canonical: path },
    openGraph: { title, description: basics.shortBio || undefined, type: "profile", url: path },
  };
}

const TEMPLATES: readonly TemplateId[] = ["blueprint", "devos", "neural-bento", "devsearch", "shiplog", "neon-3d"];

export default async function PublicPortfolioPage({
  params,
  searchParams,
}: {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ template?: string | string[] }>;
}) {
  const { handle } = await params;
  const loaded = await load(handle);
  if (!loaded) notFound();
  let data = loaded.data;
  // The sample portfolio can be previewed in any template (/p/demo?template=devos). A real portfolio
  // always shows the template its owner chose.
  const wanted = (await searchParams).template;
  if (loaded.sample && typeof wanted === "string" && (TEMPLATES as readonly string[]).includes(wanted)) {
    data = { ...data, config: { ...data.config, templateId: wanted as TemplateId } };
  }
  return <PublicPortfolio data={data} sample={loaded.sample} />;
}
