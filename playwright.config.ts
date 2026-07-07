import { readFileSync } from "fs";
import { defineConfig, devices } from "@playwright/test";

// Load .env.local (SUPABASE_URL / keys) for the spec's service-role setup —
// Next loads it for the webServer on its own, Playwright does not.
try {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch { /* .env.local is optional in CI if env vars are set directly */ }

// E2E against the dev server + the local Supabase stack (supabase start +
// npm run seed). Reuses a dev server already running on :3000 (Next allows
// only one dev instance per project dir). Uploads travel real HTTP, so
// timeouts are generous.
export default defineConfig({
  testDir: "e2e",
  testMatch: "**/*.spec.ts",
  timeout: 180_000,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
