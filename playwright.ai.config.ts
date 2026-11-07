import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { defineConfig } from "@playwright/test";

if (existsSync(".env")) loadEnvFile(".env");

// These tests exercise Node transport only; no browser or development server is needed.
export default defineConfig({
  testDir: "./e2e",
  testMatch: ["**/ai-content.spec.ts", "**/gemini.spec.ts"],
  timeout: 105_000,
  workers: 1,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: "list",
});
