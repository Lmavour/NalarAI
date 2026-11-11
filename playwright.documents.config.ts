import { defineConfig } from "@playwright/test";

// Source extraction and schema tests are local-only: no API credentials or database.
export default defineConfig({
  testDir: "./e2e",
  testMatch: ["**/document-content.spec.ts", "**/document-extraction.spec.ts", "**/document-outbox.spec.ts", "**/document-ocr.spec.ts", "**/document-mode.spec.ts"],
  workers: 1,
  fullyParallel: false,
  timeout: 30_000,
  retries: 0,
  reporter: "list",
});
