import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Subdomain portfolios: https://{handle}.<base domain>/ is served by /p/{handle}.
 * Local development works out of the box: http://{handle}.localhost:3000/
 * In production set NEXT_PUBLIC_PORTFOLIO_BASE_DOMAIN (for example "onestop.tech").
 * Only the root path of a subdomain is rewritten, and the app's own hosts are never touched.
 */
const HANDLE = /^[a-z0-9](?:[a-z0-9-]{1,28})[a-z0-9]$/;
const NOT_PORTFOLIOS = new Set(["www", "app", "api", "admin"]);

export function proxy(request: NextRequest) {
  const host = (request.headers.get("host") ?? "").split(":")[0].toLowerCase();
  const base = (process.env.NEXT_PUBLIC_PORTFOLIO_BASE_DOMAIN ?? "").toLowerCase();
  const suffixes = ["localhost", ...(base ? [base] : [])];

  for (const suffix of suffixes) {
    if (host.endsWith(`.${suffix}`)) {
      const sub = host.slice(0, -(suffix.length + 1));
      if (HANDLE.test(sub) && !NOT_PORTFOLIOS.has(sub) && request.nextUrl.pathname === "/") {
        const url = request.nextUrl.clone();
        url.pathname = `/p/${sub}`;
        return NextResponse.rewrite(url);
      }
    }
  }
  return NextResponse.next();
}

export const config = {
  // Skip Next internals and files with an extension.
  matcher: ["/((?!_next/|api/|.*\..*).*)"],
};
