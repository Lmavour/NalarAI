import { expect, test } from "@playwright/test";

for (const viewport of [
  { name: "small-mobile", width: 320, height: 740, maxSectionScreens: 1.2, maxDocumentScreens: 6.2 },
  { name: "mobile", width: 390, height: 844 },
  { name: "laptop", width: 1366, height: 768 },
  { name: "desktop", width: 1440, height: 900 },
]) {
  test(`landing fold audit at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Paham lebih dalam/i })).toBeVisible();
    await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });

    const sections = await page.locator("main > section").evaluateAll((elements, viewportHeight) => elements.map((element, index) => {
      const box = element.getBoundingClientRect();
      return {
        index,
        id: element.dataset.section || element.id || element.getAttribute("aria-label") || "section",
        height: Math.round(box.height),
        screens: Number((box.height / viewportHeight).toFixed(2)),
      };
    }), viewport.height);

    const documentScreens = await page.evaluate((height) => document.documentElement.scrollHeight / height, viewport.height);
    const maxSectionScreens = viewport.maxSectionScreens ?? 1.02;
    const maxDocumentScreens = viewport.maxDocumentScreens ?? (viewport.width < 768 ? 5.5 : 4.5);
    expect(sections.filter((section) => section.screens > maxSectionScreens), `Oversized sections at ${viewport.name}`).toEqual([]);
    expect(documentScreens, `Landing page is too long at ${viewport.name}`).toBeLessThanOrEqual(maxDocumentScreens);
  });
}
