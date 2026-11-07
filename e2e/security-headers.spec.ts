import { expect, test } from "@playwright/test";

test("application documents allow Next.js scripts while retaining frame and object protection", async ({ request }) => {
  for (const path of ["/", "/app", "/auth?mode=signup"]) {
    const response = await request.get(path, { maxRedirects: 0 });
    const csp = response.headers()["content-security-policy"];
    expect(csp).toContain("script-src 'self'");
    expect(csp).not.toMatch(/script-src(?:-elem)?\s+'none'/);
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(response.headers()["x-frame-options"]).toBe("DENY");
    expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  }
});

test("direct browser navigation hydrates landing and auth without blocked application scripts", async ({ page }) => {
  await page.addInitScript(() => {
    const target = window as typeof window & { blockedScripts: string[] };
    target.blockedScripts = [];
    document.addEventListener("securitypolicyviolation", (event) => {
      if (event.effectiveDirective.startsWith("script-src")) target.blockedScripts.push(event.blockedURI);
    });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "networkidle" });
  const menu = page.getByRole("button", { name: "Buka menu", exact: true });
  await expect(menu).toBeEnabled();
  await menu.evaluate((button: HTMLButtonElement) => button.click());
  await expect(page.locator("#landing-mobile-menu")).toBeVisible();
  expect(await page.evaluate(() => (window as typeof window & { blockedScripts: string[] }).blockedScripts)).toEqual([]);
  await page.goto("/auth?mode=signup", { waitUntil: "networkidle" });
  await page.getByRole("tab", { name: "Masuk", exact: true }).click();
  await expect(page).toHaveURL(/mode=login/);
  await expect(page.getByRole("heading", { name: /Lanjut dari progres terakhirmu/ })).toBeVisible();
  const blocked = await page.evaluate(() => (window as typeof window & { blockedScripts: string[] }).blockedScripts);
  expect(blocked).toEqual([]);
});
