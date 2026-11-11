import { defineConfig } from "@playwright/test";

// Quota and routing tests use in-memory doubles only: no environment, server, or API keys.
export default defineConfig({
  testDir: "./e2e",
  testMatch: ["**/groq-budget.spec.ts", "**/ai-router.spec.ts", "**/db-connection.spec.ts", "**/review-schedule.spec.ts"],
  timeout: 30_000,
  workers: 1,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: "list",
});
