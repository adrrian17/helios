import { defineConfig, devices } from "@playwright/test";
import "varlock/auto-load";

const WEB_URL = "https://helios.localhost";

export default defineConfig({
  testDir: "./e2e",
  // Not *.spec.ts, which the Vitest lint rules claim.
  testMatch: "**/*.e2e.ts",
  // Magic links are single-use and captured per email, so journeys run one at a time.
  workers: 1,
  forbidOnly: process.env.CI !== undefined,
  reporter: process.env.CI === undefined ? "list" : "github",
  use: {
    baseURL: WEB_URL,
    // portless serves *.localhost over HTTPS with a local certificate authority.
    ignoreHTTPSErrors: true,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "phone", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "pnpm dev",
    url: "https://api.helios.localhost/",
    ignoreHTTPSErrors: true,
    reuseExistingServer: true,
    // portless runs the API in its own session; SIGINT lets it stop the chain instead of orphaning it.
    gracefulShutdown: { signal: "SIGINT", timeout: 15_000 },
    timeout: 120_000,
  },
});
