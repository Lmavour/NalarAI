import { expect, test, type Page } from "@playwright/test";
import { documentDto, documentLessonFixture, flashcardDto, sourceRef, sourceText } from "./fixtures/document-learning";
import { dashboardFixture } from "./fixtures/learning";
import { makeTextPdf } from "./fixtures/document-files";

const referenceButtonName = `${sourceRef.label} (hlm. ${sourceRef.page})`;

async function mockSources(page: Page) {
  await page.route("**/api/documents/*/sources/*", (route) => route.fulfill({ status: 200, json: { documentName: documentDto.name, id: sourceRef.segmentId, label: sourceRef.label, page: 1, text: sourceText } }));
}

for (const viewport of [{ width: 280, height: 653 }, { width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }]) {
  test(`private document library and source dialog fit ${viewport.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.route("**/api/documents", (route) => {
      if (route.request().method() === "POST") {
        expect(route.request().headers()["content-type"]).toContain("multipart/form-data; boundary=");
        return route.fulfill({ status: 201, json: documentDto });
      }
      return route.fulfill({ status: 200, json: { documents: [] } });
    });
    await mockSources(page);
    await page.goto("/", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Materi", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Materi", exact: true })).toBeVisible();
    await expect(page.locator('[data-character-context="document-guide"]:visible')).toContainText("Pilih materi. Aku bantu.");
    await expect(page.getByText(/4 MiB|megapiksel|token AI|batas diperiksa server/i)).toHaveCount(0);
    await page.locator("input[type='file']").setInputFiles({ name: documentDto.name, mimeType: "application/pdf", buffer: makeTextPdf([sourceText]) });
    await page.getByRole("button", { name: "Unggah", exact: true }).click();
    await expect(page.getByRole("heading", { name: documentDto.name, exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Sumber pertama", exact: true }).click();
    const source = page.locator("[data-source-viewer]");
    await expect(source).toBeVisible();
    await expect(source.locator("[data-source-text]")).toContainText(sourceText);
    expect(await page.evaluate(() => (window as typeof window & { sourceExecuted?: boolean }).sourceExecuted)).toBeUndefined();
    const close = source.getByRole("button", { name: /Tutup sumber/ });
    await expect(close).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    expect(await source.evaluate((element) => element.contains(document.activeElement))).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width + 1);
    await page.screenshot({ path: testInfo.outputPath(`document-source-${viewport.width}.png`) });
    await page.keyboard.press("Escape");
    await expect(source).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Sumber pertama", exact: true })).toBeFocused();
    const undersized = await page.locator("[data-learn-bottom-nav] button:visible").evaluateAll((buttons) => buttons.filter((button) => { const box = button.getBoundingClientRect(); return box.width < 48 || box.height < 48; }).map((button) => button.textContent));
    expect(undersized).toEqual([]);
  });
}

test("document study keeps citations in material, hints and feedback without changing text progress", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/documents", (route) => route.fulfill({ status: 200, json: { documents: [documentDto] } }));
  await page.route("**/api/documents/*/study", (route) => {
    expect(route.request().postDataJSON()).toEqual({});
    return route.fulfill({ status: 201, json: documentLessonFixture });
  });
  await mockSources(page);
  await page.route("**/api/lesson-sessions/*/answer", (route) => {
    const body = route.request().postDataJSON() as { questionId: string; optionId: string };
    const index = documentLessonFixture.questions.findIndex((question) => question.id === body.questionId);
    const completed = index === documentLessonFixture.questions.length - 1;
    return route.fulfill({ status: 200, json: { questionId: body.questionId, submittedOptionId: body.optionId, correct: true, correctOptionId: body.optionId, explanation: "Klorofil menangkap energi cahaya untuk menyusun glukosa.", sourceRefs: [sourceRef], completed, ...(completed ? { award: { xpEarned: 60, score: 100, stats: dashboardFixture.stats, completedStageIds: dashboardFixture.progress.completedStageIds }, progress: dashboardFixture.progress } : {}) } });
  });
  await page.goto("/", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Materi", exact: true }).click();
  await page.getByRole("button", { name: "Pelajari dokumen", exact: true }).click();
  const lesson = page.getByRole("dialog", { name: /^Pelajaran/ });
  await expect(lesson).toBeVisible();
  await lesson.locator("[data-learn-scroll]").getByRole("button", { name: referenceButtonName, exact: true }).click();
  await expect(page.locator("[data-source-viewer]")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(lesson).toBeVisible();
  await lesson.getByRole("button", { name: "Lanjut", exact: true }).click();
  await lesson.getByRole("button", { name: "Mulai kuis", exact: true }).click();
  await lesson.getByRole("button", { name: "Petunjuk", exact: true }).click();
  const hint = page.getByRole("dialog", { name: "Petunjuk konsep", exact: true });
  await expect(hint.locator("li")).toHaveCount(1);
  await hint.getByRole("button", { name: referenceButtonName, exact: true }).click();
  await expect(page.locator("[data-source-viewer]")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(hint).toBeVisible();
  await page.keyboard.press("Escape");
  for (let index = 0; index < documentLessonFixture.questions.length; index += 1) {
    await lesson.getByRole("radio").first().click();
    await lesson.getByRole("button", { name: "Periksa jawaban", exact: true }).click();
    await expect(lesson.locator("[data-feedback]").getByRole("button", { name: referenceButtonName, exact: true })).toBeVisible();
    await lesson.getByRole("button", { name: index === documentLessonFixture.questions.length - 1 ? "Lihat hasil" : "Lanjut", exact: true }).click();
  }
  await expect(lesson.getByRole("heading", { name: "Level selesai", exact: true })).toBeVisible();
  await lesson.getByRole("button", { name: "Kembali ke materi", exact: true }).click();
  await page.getByRole("button", { name: "Jalur", exact: true }).click();
  await expect(page.locator("#learning-topic")).toHaveValue(dashboardFixture.progress.topic);
});

test("recall reveal and retries preserve the same intent across tab changes", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  let queueEmpty = false;
  const submissions: unknown[] = [];
  await page.route("**/api/documents", (route) => route.fulfill({ status: 200, json: { documents: [] } }));
  await page.route("**/api/flashcards", (route) => route.fulfill({ status: 200, json: { cards: queueEmpty ? [] : [flashcardDto], totalDue: queueEmpty ? 0 : 1 } }));
  await page.route("**/api/flashcards/*/review", (route) => {
    submissions.push(route.request().postDataJSON());
    queueEmpty = true;
    return submissions.length === 1 ? route.fulfill({ status: 503, json: { error: "Konfirmasi belum diterima." } }) : route.fulfill({ status: 200, json: { ...flashcardDto, revision: 5, dueAt: "2026-11-08T12:10:00.000Z", intervalDays: 10 / 1440 } });
  });
  await mockSources(page);
  await page.goto("/", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Ulang", exact: true }).click();
  await expect(page.locator('[data-character-context="review-guide"]:visible')).toContainText("Ingat dulu");
  await expect(page.getByText(flashcardDto.answer, { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Tampilkan jawaban", exact: true }).click();
  await expect(page.getByRole("region", { name: "Jawaban flashcard" })).toContainText(flashcardDto.answer);
  await page.locator("[data-rating='again']").click();
  await expect(page.locator("[data-review-deck]").getByRole("alert")).toContainText("Belum tersimpan");
  const saved = await page.evaluate(() => Object.keys(sessionStorage).filter((key) => key.startsWith("nalarai:review-intent:")).map((key) => JSON.parse(sessionStorage.getItem(key)!)));
  expect(Object.keys(saved[0]).sort()).toEqual(["expectedRevision", "rating", "reviewId"]);
  await page.getByRole("button", { name: "Materi", exact: true }).click();
  await page.getByRole("button", { name: "Ulang", exact: true }).click();
  await page.locator("[data-review-deck]").getByRole("button", { name: "Coba lagi", exact: true }).click();
  await expect(page.getByText("Penilaian tersimpan", { exact: true })).toBeVisible();
  expect(submissions).toHaveLength(2);
  expect(submissions[1]).toEqual(submissions[0]);
  expect(await page.evaluate(() => Object.keys(sessionStorage).filter((key) => key.startsWith("nalarai:review-intent:")))).toEqual([]);
});
