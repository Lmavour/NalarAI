import { expect, test } from "@playwright/test";

for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 740, height: 360 }, { width: 1024, height: 768 }]) {
  test(`database outage state stays accessible at ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    const failures: string[] = [];
    let generations = 0;
    page.on("pageerror", (error) => failures.push(error.message));
    page.on("request", (request) => { if (request.url().endsWith("/api/lesson-sessions")) generations += 1; });
    await page.goto("/?database=unavailable", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "Belum dapat terhubung.", exact: true })).toBeVisible();
    await expect(page.locator("[data-learn-layout]")).toHaveCount(0);
    const retry = page.getByRole("button", { name: "Coba lagi", exact: true });
    const box = await retry.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(48);
    expect(box!.height).toBeGreaterThanOrEqual(48);
    expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height + 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
    await retry.click();
    await expect(retry).toBeEnabled();
    await expect(page.getByRole("heading", { name: "Belum dapat terhubung.", exact: true })).toBeVisible();
    expect(generations).toBe(0);
    expect(failures).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath(`database-unavailable-${viewport.width}.png`) });
  });
}
