import type { ComponentType } from "react";
import type { TemplateId, TemplateProps } from "@/types/portfolio";
import { BlueprintTemplate } from "./BlueprintTemplate";
import { DevOSTemplate } from "./DevOSTemplate";
import { NeuralBentoTemplate } from "./NeuralBentoTemplate";
import { DevSearchTemplate } from "./DevSearchTemplate";
import { ShipLogBrutalistTemplate } from "./ShipLogBrutalistTemplate";
import { Neon3DDevTemplate } from "./Neon3DDevTemplate";

export type TemplateInfo = {
  id: TemplateId;
  name: string;
  tagline: string;
  roles: string[];
  /** Honest labels only: editorial picks, not usage counts. */
  badge?: "Recommended" | "Popular pick";
  Component: ComponentType<TemplateProps>;
};

/** Order is the order users see in the picker. Neon 3D Dev is the flagship, so it comes first. */
export const TEMPLATES: TemplateInfo[] = [
  { id: "neon-3d", name: "Neon 3D Dev", tagline: "Deep black, oversized type, holographic neon accents, a tech marquee and floating 3D shapes.", roles: ["Software Engineers", "Competitive Programmers"], badge: "Recommended", Component: Neon3DDevTemplate },
  { id: "blueprint", name: "Blueprint", tagline: "Engineering CAD schematic with a competitive-programming telemetry grid.", roles: ["Competitive Programmers", "Software Engineers"], Component: BlueprintTemplate },
  { id: "devos", name: "DevOS", tagline: "A macOS-style desktop with an IDE, a working terminal and a dock.", roles: ["Software Engineers", "Indie Builders"], badge: "Popular pick", Component: DevOSTemplate },
  { id: "neural-bento", name: "Neural Bento", tagline: "A sleek bento grid with spotlight borders and an interactive skill filter.", roles: ["AI Engineers", "Software Engineers"], Component: NeuralBentoTemplate },
  { id: "devsearch", name: "DevSearch", tagline: "Your career as a search results page with a Knowledge Graph panel.", roles: ["Software Engineers", "Indie Builders"], Component: DevSearchTemplate },
  { id: "shiplog", name: "ShipLog Brutalist", tagline: "Neo-brutalist shipping manifest: raw type, hard shadows, access-pass card.", roles: ["Indie Builders", "Software Engineers"], Component: ShipLogBrutalistTemplate },
];

export function templateInfo(id: TemplateId): TemplateInfo {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}

export function TemplateRenderer(props: TemplateProps) {
  const { Component } = templateInfo(props.data.config.templateId);
  return <Component {...props} />;
}
