import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicPortfolio } from "@/features/site-builder/PublicPortfolio";
import { defaultPortfolioData } from "@/features/site-builder/data/defaultPortfolioData";
import type { PortfolioData } from "@/types/portfolio";

// Public pages are rendered per request: every visit must see the latest published data (and count once).
export const instant = false;

const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
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
  return {
    title,
    description: basics.shortBio || undefined,
    robots: loaded.sample ? { index: false } : { index: true, follow: true },
    openGraph: { title, description: basics.shortBio || undefined, type: "profile" },
  };
}

export default async function PublicPortfolioPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const loaded = await load(handle);
  if (!loaded) notFound();
  return <PublicPortfolio data={loaded.data} sample={loaded.sample} />;
}
