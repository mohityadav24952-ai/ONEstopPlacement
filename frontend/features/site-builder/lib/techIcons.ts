import { createElement } from "react";
import type { IconType } from "react-icons";
import {
  SiAngular, SiClerk, SiCplusplus, SiCss, SiDart, SiDjango, SiDocker, SiDrizzle, SiExpress, SiFastapi, SiFirebase,
  SiFlask, SiFlutter, SiGit, SiGo, SiGooglegemini, SiGooglemaps, SiGraphql, SiHtml5, SiHuggingface, SiJavascript,
  SiJsonwebtokens, SiKotlin, SiLangchain, SiMongodb, SiMysql, SiNextdotjs, SiNodedotjs, SiNumpy, SiOllama, SiOpenjdk,
  SiPandas, SiPostgresql, SiPrisma, SiPython, SiPytorch, SiReact, SiReactquery, SiRedis, SiRedux, SiRust,
  SiScikitlearn, SiSocketdotio, SiSpringboot, SiSqlite, SiStreamlit, SiStripe, SiSupabase, SiSvelte, SiTailwindcss,
  SiTensorflow, SiTrpc, SiTypescript, SiVercel, SiVite, SiVuedotjs, SiWebrtc, SiZod,
} from "react-icons/si";

/** Brand logos for common technologies, keyed by a normalised name ("Node.js" -> "nodejs"). */
const ICONS: Record<string, IconType> = {
  react: SiReact, reactjs: SiReact, reactnative: SiReact,
  node: SiNodedotjs, nodejs: SiNodedotjs,
  express: SiExpress, expressjs: SiExpress,
  mongodb: SiMongodb, mongo: SiMongodb, mongoose: SiMongodb,
  next: SiNextdotjs, nextjs: SiNextdotjs,
  typescript: SiTypescript, ts: SiTypescript,
  javascript: SiJavascript, js: SiJavascript,
  python: SiPython,
  tailwind: SiTailwindcss, tailwindcss: SiTailwindcss,
  socketio: SiSocketdotio, socket: SiSocketdotio,
  docker: SiDocker,
  postgresql: SiPostgresql, postgres: SiPostgresql,
  mysql: SiMysql, sqlite: SiSqlite,
  firebase: SiFirebase, supabase: SiSupabase,
  java: SiOpenjdk, "c++": SiCplusplus, cpp: SiCplusplus,
  flask: SiFlask, django: SiDjango, fastapi: SiFastapi,
  redis: SiRedis, prisma: SiPrisma, drizzle: SiDrizzle,
  tanstackquery: SiReactquery, reactquery: SiReactquery,
  graphql: SiGraphql, trpc: SiTrpc,
  googlemaps: SiGooglemaps, googlemapsapi: SiGooglemaps, googlemapsapis: SiGooglemaps,
  ollama: SiOllama, langchain: SiLangchain, gemini: SiGooglegemini, huggingface: SiHuggingface,
  vercel: SiVercel, vite: SiVite, redux: SiRedux, zod: SiZod, clerk: SiClerk,
  html: SiHtml5, html5: SiHtml5, css: SiCss, css3: SiCss,
  jwt: SiJsonwebtokens, git: SiGit,
  tensorflow: SiTensorflow, pytorch: SiPytorch, pandas: SiPandas, numpy: SiNumpy, scikitlearn: SiScikitlearn, sklearn: SiScikitlearn,
  streamlit: SiStreamlit, springboot: SiSpringboot, spring: SiSpringboot,
  angular: SiAngular, vue: SiVuedotjs, vuejs: SiVuedotjs, svelte: SiSvelte,
  kotlin: SiKotlin, flutter: SiFlutter, dart: SiDart, go: SiGo, golang: SiGo, rust: SiRust,
  webrtc: SiWebrtc, stripe: SiStripe,
};

/** The logo for a technology name, or undefined when we do not have one (the badge then shows text only). */
export function techIcon(name: string): IconType | undefined {
  const key = name.toLowerCase().replace(/[^a-z0-9+]/g, "");
  return ICONS[key] ?? ICONS[key.replace(/js$/, "")];
}

/** Renders a technology's logo (nothing when unknown). A lookup component keeps icon choice out of render. */
export function TechLogo({ name, className }: { name: string; className?: string }) {
  const Icon = techIcon(name);
  return Icon ? createElement(Icon, { className, "aria-hidden": true }) : null;
}
