import { defineConfig } from "@playwright/test";
import baseConfig from "./playwright.config";

export default defineConfig(baseConfig, {
  testMatch: ["**/app-responsive.spec.ts", "**/db-unavailable-ui.spec.ts", "**/document-learning-ui.spec.ts", "**/document-ocr-ui.spec.ts"],
  testIgnore: [],
  use: {
    baseURL: "http://127.0.0.1:3010",
    serviceWorkers: "block",
  },
  webServer: {
    command: "node node_modules/next/dist/bin/next dev e2e/ui-fixture --hostname 127.0.0.1 --port 3010",
    url: "http://127.0.0.1:3010",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
