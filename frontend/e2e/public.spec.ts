import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

/**
 * Pages that need no sign-in: the login screen, the sample portfolio in all six templates, a missing
 * portfolio, and the static export. Accessibility is checked with axe against WCAG 2.1 A/AA; only
 * "serious" and "critical" findings fail a test (the rest are printed so they can be worked down).
 */
const TEMPLATES = ["blueprint", "devos", "neural-bento", "devsearch", "shiplog", "neon-3d"] as const;

async function expectAccessible(page: Page, label: string) {
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const blocking = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  for (const v of violations) {
    console.log(`[axe ${label}] ${v.impact}: ${v.id} (${v.nodes.length}) ${v.help}`);
  }
  expect(blocking.map((v) => `${v.id}: ${v.help} -> ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
}

async function expectNoSideScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, "page scrolls sideways").toBeLessThanOrEqual(1);
}

test("login page renders and is accessible @phone", async ({ page }) => {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveTitle(/Sign in/);
  await expect(page.getByRole("button").first()).toBeVisible();
  await expectAccessible(page, "login");
  await expectNoSideScroll(page);
});

for (const template of TEMPLATES) {
  test(`sample portfolio: ${template} template renders and is accessible @phone`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const res = await page.goto(`/p/demo?template=${template}`, { waitUntil: "domcontentloaded" });
    expect(res?.status()).toBe(200);
    await expect(page.locator("h1").first()).toBeVisible();
    await expectAccessible(page, template);
    await expectNoSideScroll(page);
    expect(errors, "uncaught errors in the browser").toEqual([]);
  });
}

test("an unknown template name falls back to the portfolio's own template", async ({ page }) => {
  const res = await page.goto("/p/demo?template=<script>", { waitUntil: "domcontentloaded" });
  expect(res?.status()).toBe(200);
  await expect(page.locator("h1").first()).toBeVisible();
});

test("a portfolio that does not exist is a 404, not an error page", async ({ page }) => {
  const res = await page.goto("/p/no-such-handle-e2e", { waitUntil: "domcontentloaded" });
  expect(res?.status()).toBe(404);
  await expect(page.getByText(/not found|could not be found|doesn.t exist|does not exist/i).first()).toBeVisible();
});

test("static export refuses unpublished portfolios and bad handles", async ({ request }) => {
  expect((await request.get("/api/site-export/no-such-handle-e2e")).status()).toBe(404);
  expect((await request.get("/api/site-export/..%2F..%2Fetc")).status()).toBe(400);
});

const HANDLE = process.env.E2E_HANDLE; // a real published portfolio on this machine, e.g. E2E_HANDLE=mohit

test("static export of a published portfolio is a zip with index.html and no scripts", async ({ request }) => {
  test.skip(!HANDLE, "set E2E_HANDLE to a published portfolio to run this");
  const res = await request.get(`/api/site-export/${HANDLE}`);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toBe("application/zip");
  const body = await res.body();
  expect(body.subarray(0, 2).toString()).toBe("PK");
  const text = body.toString("latin1");
  expect(text).toContain("index.html");
  expect(text).not.toContain("<script");
});

test("a real published portfolio renders without the owner's phone number @phone", async ({ page }) => {
  test.skip(!HANDLE, "set E2E_HANDLE to a published portfolio to run this");
  const res = await page.goto(`/p/${HANDLE}`, { waitUntil: "domcontentloaded" });
  expect(res?.status()).toBe(200);
  await expect(page.locator("h1").first()).toBeVisible();
  expect(await page.content()).not.toMatch(/\+91[\s-]?\d{5}[\s-]?\d{5}/);
  await expectAccessible(page, HANDLE ?? "");
  await expectNoSideScroll(page);
});
