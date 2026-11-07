import { expect, test } from "@playwright/test";

async function expectContained(page: import("@playwright/test").Page, label: string) {
  const result = await page.evaluate(() => {
    const viewport = document.documentElement.clientWidth;
    const outside = Array.from(document.body.querySelectorAll<HTMLElement>("*"))
      .flatMap((element) => {
        const box = element.getBoundingClientRect();
        if (box.width === 0 || box.height === 0 || (box.left >= -1 && box.right <= viewport + 1)) return [];
        return [{ tag: element.tagName, text: element.textContent?.trim().slice(0, 50), left: Math.round(box.left), right: Math.round(box.right) }];
      })
      .sort((a, b) => Math.max(Math.abs(b.left), Math.abs(b.right - viewport)) - Math.max(Math.abs(a.left), Math.abs(a.right - viewport)))
      .slice(0, 10);
    return { viewport, document: document.documentElement.scrollWidth, outside };
  });
  expect(result.document, `${label} overflows horizontally: ${JSON.stringify(result.outside)}`).toBeLessThanOrEqual(result.viewport + 1);
}

test("landing page exposes the learning journey and install metadata", async ({ page, request }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /Paham lebih dalam/i })).toBeVisible();
  await expect(page.locator("[data-section='hero']").getByRole("link", { name: /Buat jalur belajarmu|Mulai belajar/i })).toBeVisible();
  await expect(page.getByText("Sapphire League", { exact: true })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Navigasi utama" }).locator("img[src*='logo-mark.png']")).toBeVisible();
  await expect(page.locator("link[rel='icon'][href='/favicon.png']")).toHaveCount(1);

  const manifest = await request.get("/manifest.json");
  expect(manifest.ok()).toBeTruthy();
  const data = (await manifest.json()) as { name: string; start_url: string; display: string; icons: Array<{ src: string; type: string }> };
  expect(data.name).toContain("NalarAI");
  expect(data.start_url).toContain("/app");
  expect(data.display).toBe("standalone");
  expect(data.icons.map((icon) => icon.src)).toEqual(["/icon-192.png", "/icon-512.png", "/icon-maskable-512.png"]);
  for (const icon of data.icons) {
    const iconResponse = await request.get(icon.src);
    expect(iconResponse.ok()).toBeTruthy();
    expect(iconResponse.headers()["content-type"]).toContain("image/png");
  }
});

test("authentication screen validates signup inputs", async ({ page }) => {
  await page.goto("/auth?mode=signup", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /Mulai jalur belajarmu/i })).toBeVisible();
  const email = page.getByLabel("Email");
  await expect(email).toBeEnabled();
  await email.fill("alamat-yang-salah");
  await page.getByLabel("Password", { exact: true }).fill("pendek");
  await page.getByLabel("Ulangi password").fill("berbeda");
  await page.getByRole("button", { name: /Buat akun & mulai/i }).click();
  await expect(page.locator("form [role='alert']")).toContainText("alamat email yang valid");
});

test("authentication tabs keep the page context and URL synchronized", async ({ page }) => {
  await page.goto("/auth?mode=signup", { waitUntil: "domcontentloaded" });
  const loginTab = page.getByRole("tab", { name: "Masuk", exact: true });
  await loginTab.click();
  await expect(page).toHaveURL(/mode=login/);
  await expect(page.getByRole("heading", { name: /Lanjut dari progres terakhirmu/i })).toBeVisible();

  await page.getByRole("tab", { name: "Masuk", exact: true }).press("ArrowLeft");
  await expect(page).toHaveURL(/mode=signup/);
  await expect(page.getByRole("heading", { name: /Mulai jalur belajarmu/i })).toBeVisible();
});

test("protected app redirects anonymous learners", async ({ page }) => {
  await page.goto("/app", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/auth\?mode=login/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: /Lanjut dari progres terakhirmu/i })).toBeVisible();
});

test("service worker is served from the application origin", async ({ request }) => {
  const response = await request.get("/sw.js");
  expect(response.ok()).toBeTruthy();
  expect(response.headers()["cache-control"]).toContain("no-cache");
  expect(await response.text()).toContain("nalarai-shell-v3");
});

test("landing and auth layouts reflow without horizontal scrolling", async ({ page }) => {
  for (const viewport of [
    { width: 280, height: 653 },
    { width: 320, height: 740 },
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Paham lebih dalam/i })).toBeVisible();
    await expectContained(page, `landing at ${viewport.width}px`);

    if (viewport.width < 768) {
      const menuButton = page.getByRole("button", { name: "Buka menu", exact: true });
      await expect(menuButton).toBeEnabled();
      await menuButton.evaluate((button: HTMLButtonElement) => button.click());
      await expect(page.locator("#landing-mobile-menu")).toBeVisible();
      await expectContained(page, `landing menu at ${viewport.width}px`);
    }

    await page.goto("/auth?mode=signup", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Mulai jalur belajarmu/i })).toBeVisible();
    await expectContained(page, `auth at ${viewport.width}px`);
  }
});

test("public mobile controls keep a 48px touch target", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });

  for (const path of ["/", "/auth?mode=signup"]) {
    await page.goto(path, { waitUntil: "networkidle" });
    if (path === "/") {
      const menuButton = page.getByRole("button", { name: "Buka menu", exact: true });
      await expect(menuButton).toBeEnabled();
      await menuButton.evaluate((button: HTMLButtonElement) => button.click());
      await expect(page.locator("#landing-mobile-menu")).toBeVisible();
    }
    const undersized = await page.locator("[data-app-root] button, [data-app-root] a[href], [data-app-root] input").evaluateAll((controls) => controls.flatMap((control) => {
      const element = control as HTMLElement;
      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      if (box.width === 0 || box.height === 0 || style.visibility === "hidden" || style.display === "none" || style.clipPath === "inset(50%)") return [];
      return box.width < 47.5 || box.height < 47.5
        ? [{ label: element.getAttribute("aria-label") ?? element.textContent?.trim().slice(0, 40), width: Math.round(box.width), height: Math.round(box.height) }]
        : [];
    }));
    expect(undersized, `${path} has undersized mobile controls`).toEqual([]);
  }
});
