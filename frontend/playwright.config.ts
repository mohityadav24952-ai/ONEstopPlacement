import { defineConfig, devices } from "@playwright/test";

/**
 * Browser smoke tests: `npm run test:e2e`. They use the Chrome already installed on the machine (no
 * browser download) and reuse the dev servers if they are running, otherwise they start them.
 * Only pages that need no sign-in are covered; signed-in flows are checked by hand for now.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1, // dev machines here are memory-tight; one browser at a time
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    channel: "chrome",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], channel: "chrome" } },
    { name: "phone", use: { ...devices["Pixel 7"], channel: "chrome" }, grep: /@phone/ },
  ],
  webServer: [
    {
      command: "venv\\Scripts\\python.exe -m uvicorn app.main:app --port 8000",
      cwd: "../backend",
      url: "http://127.0.0.1:8000/health",
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: "npm run dev",
      url: "http://localhost:3000/login",
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});
