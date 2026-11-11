import { existsSync } from "node:fs";
import { isAbsolute } from "node:path";
import { loadEnvFile } from "node:process";
import { defineConfig, devices } from "@playwright/test";

try {
  loadEnvFile(".env");
} catch {
  // CI can provide variables directly without a local .env file.
}

const executablePath =
  process.env.PLAYWRIGHT_CHROMIUM_PATH ??
  "C:\\Users\\lmavour\\AppData\\Local\\Chromium\\Application\\chrome.exe";

if (!isAbsolute(executablePath) || !existsSync(executablePath)) {
  throw new Error(`PLAYWRIGHT_CHROMIUM_PATH must point to an existing local Chromium executable: ${executablePath}`);
}

export default defineConfig({
  testDir: "./e2e",
  testIgnore: ["**/app-responsive.spec.ts", "**/db-unavailable-ui.spec.ts", "**/document-learning-ui.spec.ts", "**/document-ocr-ui.spec.ts"],
  timeout: 90_000,
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    navigationTimeout: 60_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    serviceWorkers: "allow",
  },
  projects: [
    {
      name: "desktop-local-chromium",
      use: {
        ...devices["Desktop Chrome"],
        browserName: "chromium",
        launchOptions: {
          executablePath,
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
        },
      },
    },
    {
      name: "mobile-local-chromium",
      use: {
        ...devices["Pixel 7"],
        browserName: "chromium",
        launchOptions: {
          executablePath,
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
        },
      },
    },
  ],
  webServer: {
    command: "npm.cmd run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
