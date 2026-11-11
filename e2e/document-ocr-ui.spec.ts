import { expect, test } from "@playwright/test";
import { documentDto } from "./fixtures/document-learning";
import { makeTextPdf } from "./fixtures/document-files";
import { makeScanImage } from "./fixtures/ocr-files";

for (const viewport of [{ width: 280, height: 653 }, { width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }]) {
  test(`OCR choice and image upload remain responsive at ${viewport.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    let uploads = 0;
    await page.route("**/api/documents", (route) => {
      if (route.request().method() === "POST") {
        uploads += 1;
        expect(route.request().postDataBuffer()?.toString("utf8")).toMatch(/name="extractionMode"\r?\n\r?\nocr/);
        return route.fulfill({ status: 201, json: { ...documentDto, kind: "image", extractionMode: "ocr", name: "scan.png", pageCount: 1, segmentCount: 3 } });
      }
      return route.fulfill({ status: 200, json: { documents: [] } });
    });
    await page.goto("/", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Materi", exact: true }).click();
    const library = page.locator("[data-document-library]");
    const textMode = library.getByRole("radio", { name: /Teks/ });
    const ocrMode = library.getByRole("radio", { name: /Pindai/ });
    await expect(textMode).toBeChecked();
    await library.locator("input[type=file]").setInputFiles({ name: "scan.png", mimeType: "image/png", buffer: await makeScanImage() });
    await expect(library.getByRole("button", { name: "Unggah", exact: true })).toBeDisabled();
    await expect(library.getByRole("alert")).toContainText("Pindai");
    await ocrMode.check();
    await expect(library.getByRole("button", { name: "Unggah", exact: true })).toBeEnabled();
    expect(uploads).toBe(0);
    await library.getByRole("button", { name: "Unggah", exact: true }).click();
    await expect(library.getByRole("heading", { name: "scan.png", exact: true })).toBeVisible();
    await expect(library.getByRole("status").filter({ hasText: "scan.png siap dipelajari" })).toBeVisible();
    expect(uploads).toBe(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width + 1);
    const targets = await library.locator("fieldset label").evaluateAll((labels) => labels.map((label) => label.getBoundingClientRect().height));
    expect(targets.every((height) => height >= 48)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`ocr-choice-${viewport.width}.png`) });
  });
}

test("OCR unavailability retains the file and switches only after explicit user action", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const modes: string[] = [];
  await page.route("**/api/documents", (route) => {
    if (route.request().method() !== "POST") return route.fulfill({ status: 200, json: { documents: [] } });
    const raw = route.request().postDataBuffer()?.toString("utf8") ?? "";
    const mode = /name="extractionMode"\r?\n\r?\n(ocr|text)/.exec(raw)?.[1] ?? "missing";
    modes.push(mode);
    return mode === "ocr"
      ? route.fulfill({ status: 503, json: { error: "OCR sedang tidak tersedia.", code: "OCR_SERVICE_UNAVAILABLE", fallbackMode: "text" } })
      : route.fulfill({ status: 201, json: { ...documentDto, extractionMode: "text" } });
  });
  await page.goto("/", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Materi", exact: true }).click();
  const library = page.locator("[data-document-library]");
  await library.getByRole("radio", { name: /Pindai/ }).check();
  await library.locator("input[type=file]").setInputFiles({ name: documentDto.name, mimeType: "application/pdf", buffer: makeTextPdf(["Klorofil menangkap energi cahaya dan tumbuhan menyimpan energi kimia di dalam gula hasil fotosintesis."]) });
  await library.getByRole("button", { name: "Unggah", exact: true }).click();
  await expect(library.getByRole("alert")).toContainText("Pemindaian belum tersedia");
  await expect(library.getByRole("radio", { name: /Pindai/ })).toBeChecked();
  expect(await library.locator("input[type=file]").evaluate((input: HTMLInputElement) => input.files?.length)).toBe(1);
  await library.getByRole("button", { name: "Gunakan mode Teks", exact: true }).click();
  await expect(library.getByRole("radio", { name: /Teks/ })).toBeChecked();
  expect(modes).toEqual(["ocr"]);
  await library.getByRole("button", { name: "Unggah", exact: true }).click();
  await expect(library.getByRole("heading", { name: documentDto.name, exact: true })).toBeVisible();
  expect(modes).toEqual(["ocr", "text"]);
});
