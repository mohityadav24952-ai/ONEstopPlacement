import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createZip } from "@/features/site-builder/lib/zip";
import type { ZipFile } from "@/features/site-builder/lib/zip";

/**
 * Static export of a PUBLISHED portfolio: the server-rendered page plus its stylesheets and fonts, saved as
 * a folder you can drop onto Netlify, Vercel or GitHub Pages. It only ever reads the public page, so an
 * unpublished portfolio cannot be exported. The snapshot has no JavaScript: layout and content are kept,
 * interactive extras (theme toggle, mascot, terminal) need the live app.
 */
const HANDLE = /^[a-z0-9](?:[a-z0-9-]{1,28})[a-z0-9]$/i;

export async function GET(request: NextRequest, { params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  if (!HANDLE.test(handle)) return NextResponse.json({ error: "Invalid handle." }, { status: 400 });

  const origin = request.nextUrl.origin;
  const page = await fetch(`${origin}/p/${handle}`, { cache: "no-store" });
  if (!page.ok) {
    return NextResponse.json({ error: "This portfolio is not published, so there is nothing to export yet." }, { status: 404 });
  }
  let html = await page.text();
  const files: ZipFile[] = [];
  const enc = new TextEncoder();
  const grab = async (path: string): Promise<Uint8Array | null> => {
    try {
      const res = await fetch(new URL(path, origin), { cache: "no-store" }); // same origin only
      return res.ok ? new Uint8Array(await res.arrayBuffer()) : null;
    } catch {
      return null;
    }
  };

  // Stylesheets (and the fonts they reference) become local files.
  const sheets = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]*>/g)].map((m) => m[0]);
  let n = 0;
  for (const tag of sheets) {
    const href = /href="([^"]+)"/.exec(tag)?.[1];
    if (!href || /^https?:\/\//i.test(href)) continue;
    const bytes = await grab(href);
    if (!bytes) continue;
    let css = new TextDecoder().decode(bytes);
    for (const m of new Set([...css.matchAll(/url\((?:"|')?(\/_next\/static\/media\/[^)"']+)(?:"|')?\)/g)].map((x) => x[1]))) {
      const font = await grab(m);
      if (!font) continue;
      const name = `assets/fonts/${m.split("/").pop()}`;
      files.push({ name, data: font });
      css = css.split(m).join(`./fonts/${m.split("/").pop()}`);
    }
    const cssName = `assets/style-${++n}.css`;
    files.push({ name: cssName, data: enc.encode(css) });
    html = html.replace(tag, `<link rel="stylesheet" href="./${cssName}">`);
  }

  // A static snapshot carries no scripts, preloads or framework markers.
  html = html
    .replace(/<script\b[\s\S]*?<\/script>/g, "")
    .replace(/<link[^>]+rel="preload"[^>]*>/g, "")
    .replace(/<link[^>]+rel="modulepreload"[^>]*>/g, "")
    .replace(/<!--\$\??-->|<!--\/\$-->/g, "");

  const readme = [
    `Static export of ${handle}'s portfolio`,
    "",
    "Deploy: drag this folder onto https://app.netlify.com/drop, or run `vercel --prod` inside it,",
    "or commit it to a GitHub repository and enable Pages.",
    "",
    "This is a snapshot of the page as it looked when you exported it. Layout and content are kept.",
    "Interactive extras (light/dark toggle, mascot, terminal) need the live app. Re-export after you edit.",
    "",
  ].join("\n");
  files.unshift({ name: "index.html", data: enc.encode(html) });
  files.push({ name: "README.txt", data: enc.encode(readme) });

  return new NextResponse(Buffer.from(createZip(files)), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${handle}-portfolio.zip"`,
      "Cache-Control": "no-store",
    },
  });
}
