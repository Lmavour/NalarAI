import { expect, test, type Page } from "@playwright/test";
import { dashboardFixture, lessonFixture } from "./fixtures/learning";

const auditOnly = process.env.UI_AUDIT === "1";
const singleQuestionLesson = { ...lessonFixture, questions: lessonFixture.questions.slice(0, 1) };

async function checkHorizontalBounds(page: Page, name: string) {
  const result = await page.evaluate(() => {
    const root = Array.from(document.querySelectorAll("dialog[open]")).at(-1) ?? document;
    const width = document.documentElement.clientWidth;
    const selectors = 'header, footer, main section, main h1, main h2, main h3, main p, main button, main input, nav button, [data-character], [data-character-moment], [data-learn-companion], [aria-label^="Streak:"], [aria-label^="XP:"], [aria-label^="Hearts:"]';
    const outside: { text: string; left: number; right: number }[] = [];

    for (const element of root.querySelectorAll<HTMLElement>(selectors)) {
      const box = element.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) continue;
      let scrollable = false;
      let left = 0;
      let right = width;
      for (let parent = element.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
        const overflowX = getComputedStyle(parent).overflowX;
        if ((overflowX === "auto" || overflowX === "scroll") && parent.scrollWidth > parent.clientWidth) {
          scrollable = true;
          break;
        }
        if (["auto", "scroll", "hidden", "clip"].includes(overflowX)) {
          const parentBox = parent.getBoundingClientRect();
          left = Math.max(left, parentBox.left);
          right = Math.min(right, parentBox.right);
        }
      }
      if (!scrollable && (box.left < left - 1 || box.right > right + 1)) {
        outside.push({ text: element.textContent?.trim().slice(0, 70) ?? element.tagName, left: Math.round(box.left), right: Math.round(box.right) });
      }
    }

    return { width, documentWidth: document.documentElement.scrollWidth, outside };
  });

  await page.screenshot({ path: test.info().outputPath(`${name}.png`), fullPage: true });
  await page.screenshot({ path: test.info().outputPath(`${name}-viewport.png`) });
  if (auditOnly) {
    console.log(`${name}: ${JSON.stringify(result)}`);
    return;
  }
  expect(result.documentWidth, `${name}: document overflows the viewport`).toBeLessThanOrEqual(result.width + 1);
  expect(result.outside, `${name}: essential content is outside the viewport`).toEqual([]);
}

async function enterQuiz(page: Page, nodeName: RegExp) {
  await page.getByRole("button", { name: nodeName }).click();
  const dialog = page.getByRole("dialog", { name: /^Pelajaran/ });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Lanjut", exact: true }).click();
  await dialog.getByRole("button", { name: "Mulai kuis", exact: true }).click();
  return dialog;
}

for (const viewport of [
  { width: 280, height: 653 },
  { width: 320, height: 740 },
  { width: 390, height: 844 },
  { width: 767, height: 900 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
]) {
  test(`app panels remain contained at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: /Mau belajar apa hari ini/i })).toBeVisible();
    await expect(page.locator('[aria-label^="Hearts:"]:visible')).toBeVisible();
    await expect(page.locator('[data-companion][data-character="gara"]:visible')).toBeVisible();
    if (viewport.width >= 768) {
      await expect(page.locator("[data-learn-navigation]")).toBeVisible();
      await expect(page.locator("[data-learn-companion]")).toBeVisible();
      await expect(page.locator("[data-learn-bottom-nav]")).not.toBeVisible();
      const geometry = await page.evaluate(() => {
        const nav = document.querySelector("[data-learn-navigation]")!.getBoundingClientRect();
        const main = document.querySelector("[data-learn-main]")!.getBoundingClientRect();
        const rail = document.querySelector("[data-learn-companion]")!.getBoundingClientRect();
        return { navRight: nav.right, mainLeft: main.left, mainRight: main.right, railLeft: rail.left };
      });
      expect(geometry.navRight).toBeLessThan(geometry.mainLeft);
      expect(geometry.mainRight).toBeLessThan(geometry.railLeft);
      const railBefore = await page.locator("[data-learn-companion]").boundingBox();
      await page.locator("[data-learn-scroll]").evaluate((element) => { element.scrollTop = 300; });
      expect(await page.locator("[data-learn-companion]").boundingBox()).toEqual(railBefore);
      await page.locator("[data-learn-scroll]").evaluate((element) => { element.scrollTop = 0; });
    } else {
      await expect(page.locator("[data-learn-bottom-nav]")).toBeVisible();
      await expect(page.locator("[data-learn-navigation]")).not.toBeVisible();
    }
    await checkHorizontalBounds(page, `path-${viewport.width}`);

    await page.getByRole("button", { name: "Liga", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Sapphire League", exact: true })).toBeVisible();
    await checkHorizontalBounds(page, `league-${viewport.width}`);

    await page.getByRole("button", { name: "Profil", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Maya Putri", exact: true })).toBeVisible();
    await expect(page.locator('[data-character-context="long-streak"]')).toHaveCount(0);
    await checkHorizontalBounds(page, `profile-${viewport.width}`);
  });
}

for (const viewport of [
  { width: 320, height: 568 },
  { width: 740, height: 360 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
]) {
  test(`lesson content and controls fit ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.route("**/api/lesson-sessions", (route) => route.fulfill({ status: 201, json: singleQuestionLesson }));
    await page.route("**/api/lesson-sessions/*/answer", (route) => route.fulfill({
      status: 200,
      json: {
        questionId: lessonFixture.questions[0].id,
        correct: true,
        correctOptionId: lessonFixture.questions[0].options[0].id,
        explanation: "Klorofil menangkap energi cahaya, lalu tumbuhan menyimpannya sebagai energi kimia di dalam gula. Energi tersebut dapat berpindah ketika tumbuhan dimakan oleh organisme lain.",
        completed: true,
        award: { xpEarned: 60, score: 100, stats: dashboardFixture.stats, completedStageIds: ["foundation", "core-concept", "connections"] },
        progress: dashboardFixture.progress,
      },
    }));

    await page.goto("/", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /^Hubungkan ide/ }).click();
    const dialog = page.getByRole("dialog", { name: /^Pelajaran/ });
    await expect(dialog).toBeVisible();
    await checkHorizontalBounds(page, `material-${viewport.width}`);
    await dialog.getByRole("button", { name: "Lanjut", exact: true }).click();
    await dialog.getByRole("button", { name: "Mulai kuis", exact: true }).click();
    await expect(dialog.getByRole("heading", { name: lessonFixture.questions[0].prompt })).toBeVisible();
    await checkHorizontalBounds(page, `quiz-${viewport.width}`);

    const answer = dialog.getByRole("radio", { name: new RegExp(lessonFixture.questions[0].options[0].text.slice(0, 40)) });
    await answer.click();
    await expect(answer).toHaveAttribute("aria-checked", "true");
    await dialog.getByRole("button", { name: "Periksa jawaban", exact: true }).click();
    await expect(dialog.getByText("Tepat sekali", { exact: true })).toBeVisible();
    await expect(dialog.locator('[data-character-context="answer-correct"][data-character-moment="putri"]:visible')).toBeVisible();
    await expect(dialog.locator('[data-awarded-xp="60"]')).toBeVisible();
    await expect(dialog.locator('[data-companion]:visible [data-confetti]')).toHaveCount(1);
    await checkHorizontalBounds(page, `feedback-${viewport.width}`);
    const action = dialog.getByRole("button", { name: "Lihat hasil", exact: true });
    if (!auditOnly) {
      const box = await action.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height + 1);
      if (viewport.width < 768) {
        const nav = await dialog.locator("[data-learn-bottom-nav]").boundingBox();
        expect(box!.y + box!.height).toBeLessThanOrEqual(nav!.y);
      }
    }
    await action.click();
    await expect(dialog.getByRole("heading", { name: /Kemenangan kecil/i })).toBeVisible();
    await expect(dialog.locator('[data-companion][data-character="putri"]:visible')).toBeVisible();
    await checkHorizontalBounds(page, `completion-${viewport.width}`);
    await dialog.getByRole("button", { name: /Kembali ke jalur/ }).click();
    await expect(dialog).not.toBeVisible();
  });
}

test("install help fits a short viewport and keeps keyboard focus inside the dialog", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 360 });
  await page.goto("/", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Buka menu", exact: true }).click();
  await page.locator("#app-mobile-menu").getByRole("button", { name: "Install aplikasi", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Bawa NalarAI ke layar utama" });
  await expect(dialog).toBeVisible();
  const box = await dialog.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(361);
  await checkHorizontalBounds(page, "install-short-screen");
  await page.keyboard.press("Tab");
  expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
});

test("character coaching escalates from Rara to Bima after repeated wrong answers", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/lesson-sessions", (route) => route.fulfill({ status: 201, json: lessonFixture }));
  await page.route("**/api/lesson-sessions/*/answer", async (route) => {
    const request = route.request().postDataJSON() as { questionId: string };
    const index = lessonFixture.questions.findIndex((question) => question.id === request.questionId);
    const question = lessonFixture.questions[index];
    const completed = index === lessonFixture.questions.length - 1;
    await route.fulfill({
      status: 200,
      json: {
        questionId: question.id,
        correct: false,
        correctOptionId: question.options[0].id,
        explanation: "Perhatikan kembali hubungan sebab dan akibat pada konsep ini.",
        completed,
        award: completed ? { xpEarned: 20, score: 0, stats: { ...dashboardFixture.stats, hearts: 2 }, completedStageIds: ["foundation", "core-concept", "connections"] } : undefined,
        progress: dashboardFixture.progress,
      },
    });
  });

  await page.goto("/", { waitUntil: "networkidle" });
  const dialog = await enterQuiz(page, /^Hubungkan ide/);

  for (let index = 0; index < lessonFixture.questions.length; index += 1) {
    const question = lessonFixture.questions[index];
    await dialog.getByRole("radio", { name: question.options[1].text, exact: true }).click();
    await dialog.getByRole("button", { name: "Periksa jawaban", exact: true }).click();
    const expectedCharacter = index === 2 ? "bima" : "rara";
    const expectedContext = index === 2 ? "repeated-wrong" : "answer-wrong";
    const moment = dialog.locator(`[data-character-context="${expectedContext}"][data-character-moment="${expectedCharacter}"]:visible`);
    await expect(moment).toBeVisible();
    await expect(moment.locator("[data-companion-frame]")).toHaveCount(1);
    await expect.poll(() => moment.locator("img").evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
    if (index < lessonFixture.questions.length - 1) await dialog.getByRole("button", { name: "Lanjut", exact: true }).click();
  }
  await checkHorizontalBounds(page, "character-repeated-wrong");
});

test("Nenek Sri appears only after the active streak reaches 30 days", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?streak=30", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Profil", exact: true }).click();
  const moment = page.locator('[data-character-context="long-streak"][data-character-moment="nenek_sri"]:visible');
  await expect(moment).toBeVisible();
  await expect(moment).toContainText("30 hari");
  await checkHorizontalBounds(page, "character-long-streak");
});

test("Putri celebrates a league promotion after lesson rewards are applied", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/lesson-sessions", (route) => route.fulfill({ status: 201, json: singleQuestionLesson }));
  await page.route("**/api/lesson-sessions/*/answer", (route) => route.fulfill({
    status: 200,
    json: {
      questionId: lessonFixture.questions[0].id,
      correct: true,
      correctOptionId: lessonFixture.questions[0].options[0].id,
      explanation: "Jawaban benar.",
      completed: true,
      award: { xpEarned: 100, score: 100, stats: { ...dashboardFixture.stats, league: "Diamond" }, completedStageIds: ["foundation", "core-concept", "connections"] },
      progress: dashboardFixture.progress,
    },
  }));

  await page.goto("/", { waitUntil: "networkidle" });
  const dialog = await enterQuiz(page, /^Hubungkan ide/);
  await dialog.getByRole("radio", { name: lessonFixture.questions[0].options[0].text, exact: true }).click();
  await dialog.getByRole("button", { name: "Periksa jawaban", exact: true }).click();
  await dialog.getByRole("button", { name: "Lihat hasil", exact: true }).click();
  await dialog.getByRole("button", { name: /Kembali ke jalur/ }).click();
  await page.getByRole("button", { name: "Liga", exact: true }).click();
  await expect(page.locator('[data-character-context="league-promotion"][data-character-moment="putri"]:visible')).toBeVisible();
});

test("Gara leads a learner through onboarding and first mastery victory", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?new=1", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Mulai bareng Gara.", exact: true })).toBeVisible();
  await expect(page.locator('[data-companion][data-character="gara"][data-expression="excited"]:visible')).toBeVisible();

  const masteryLesson = { ...singleQuestionLesson, stageId: "mastery", title: "Tantangan akhir" };
  await page.route("**/api/lesson-sessions", (route) => route.fulfill({ status: 201, json: masteryLesson }));
  await page.route("**/api/lesson-sessions/*/answer", (route) => route.fulfill({
    status: 200,
    json: {
      questionId: masteryLesson.questions[0].id,
      correct: true,
      correctOptionId: masteryLesson.questions[0].options[0].id,
      explanation: "Jawaban benar.",
      completed: true,
      award: { xpEarned: 100, score: 100, stats: dashboardFixture.stats, completedStageIds: ["foundation", "core-concept", "connections", "application", "mastery"] },
      progress: { ...dashboardFixture.progress, completedStageIds: ["foundation", "core-concept", "connections", "application", "mastery"] },
    },
  }));
  await page.goto("/?preMastery=1", { waitUntil: "networkidle" });
  const dialog = await enterQuiz(page, /^Tantangan akhir/);
  await dialog.getByRole("radio", { name: masteryLesson.questions[0].options[0].text, exact: true }).click();
  await dialog.getByRole("button", { name: "Periksa jawaban", exact: true }).click();
  await dialog.getByRole("button", { name: "Lihat hasil", exact: true }).click();
  await expect(dialog.locator('[data-companion][data-character="gara"][data-expression="excited"]:visible')).toBeVisible();
});

test("completed path message does not overlap the final node", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/?completed=1", { waitUntil: "networkidle" });
  const node = page.getByRole("button", { name: /^Tantangan akhir/ });
  const message = page.getByText("Jalur selesai. Ulangi level untuk menguatkan ingatanmu.", { exact: true });
  await node.scrollIntoViewIfNeeded();
  const nodeBox = await node.boundingBox();
  const messageBox = await message.boundingBox();
  expect(nodeBox).not.toBeNull();
  expect(messageBox).not.toBeNull();
  expect(messageBox!.y).toBeGreaterThan(nodeBox!.y + nodeBox!.height);
  await expect(page.getByText("Mulai di sini", { exact: true })).toHaveCount(0);
  await checkHorizontalBounds(page, "completed-path");
});

test("mobile app controls keep a 48px touch target", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Buka menu", exact: true }).click();

  const undersized = await page.locator("button").evaluateAll((buttons) => buttons.flatMap((button) => {
    const element = button as HTMLButtonElement;
    const box = element.getBoundingClientRect();
    if (box.width === 0 || box.height === 0 || getComputedStyle(element).visibility === "hidden") return [];
    return box.width < 47.5 || box.height < 47.5
      ? [{ label: element.getAttribute("aria-label") ?? element.textContent?.trim().slice(0, 40), width: Math.round(box.width), height: Math.round(box.height) }]
      : [];
  }));

  expect(undersized).toEqual([]);
});

for (const viewport of [{ width: 390, height: 844 }, { width: 740, height: 360 }, { width: 1024, height: 768 }]) {
  test(`hint sheet preserves the answer and focus at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    let answerRequests = 0;
    page.on("request", (request) => { if (request.url().endsWith("/answer")) answerRequests += 1; });
    await page.route("**/api/lesson-sessions", (route) => route.fulfill({ status: 201, json: lessonFixture }));
    await page.goto("/", { waitUntil: "networkidle" });
    const lesson = await enterQuiz(page, /^Hubungkan ide/);
    const answer = lesson.getByRole("radio").first();
    await answer.click();
    const hintButton = lesson.getByRole("button", { name: "Petunjuk", exact: true });
    await hintButton.click();

    const hint = page.getByRole("dialog", { name: "Petunjuk konsep", exact: true });
    await expect(hint).toBeVisible();
    await expect(hint.getByText(lessonFixture.material[0].keyTakeaway, { exact: true })).toBeVisible();
    await expect(hint.locator('[data-companion][data-character="mang_ujang"]')).toBeVisible();
    const close = hint.getByRole("button", { name: "Tutup petunjuk", exact: true });
    await expect(close).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    expect(await hint.evaluate((element) => element.contains(document.activeElement))).toBe(true);
    const back = await hint.getByRole("button", { name: "Kembali ke soal", exact: true }).boundingBox();
    expect(back!.y).toBeGreaterThanOrEqual(0);
    expect(back!.y + back!.height).toBeLessThanOrEqual(viewport.height + 1);
    await checkHorizontalBounds(page, `hint-${viewport.width}`);

    await page.keyboard.press("Escape");
    await expect(hint).not.toBeVisible();
    await expect(lesson).toBeVisible();
    await expect(hintButton).toBeFocused();
    await expect(answer).toHaveAttribute("aria-checked", "true");
    expect(answerRequests).toBe(0);
  });
}

test("network errors keep the selection without counting as mistakes or awarding XP", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  let attempts = 0;
  await page.route("**/api/lesson-sessions", (route) => route.fulfill({ status: 201, json: lessonFixture }));
  await page.route("**/api/lesson-sessions/*/answer", async (route) => {
    attempts += 1;
    expect(route.request().headers()["idempotency-key"]).toBe(`${lessonFixture.sessionId}:${lessonFixture.questions[0].id}`);
    if (attempts <= 3) {
      await route.fulfill({ status: 503, json: { error: "Layanan sedang sibuk. Coba lagi." } });
    } else {
      await route.fulfill({ status: 200, json: { questionId: lessonFixture.questions[0].id, correct: false, correctOptionId: lessonFixture.questions[0].options[0].id, explanation: "Coba hubungkan cahaya dengan energi yang tersimpan.", completed: false } });
    }
  });
  await page.goto("/", { waitUntil: "networkidle" });
  const lesson = await enterQuiz(page, /^Hubungkan ide/);
  const answer = lesson.getByRole("radio").nth(1);
  await answer.click();
  for (let index = 0; index < 3; index += 1) {
    const response = page.waitForResponse((reply) => reply.url().endsWith("/answer"));
    await lesson.getByRole("button", { name: "Periksa jawaban", exact: true }).click();
    await response;
    await expect(lesson.getByRole("alert")).toContainText("Layanan sedang sibuk");
    await expect(answer).toHaveAttribute("aria-checked", "true");
    await expect(answer).toBeEnabled();
    await expect(lesson.locator("[data-feedback]")).toHaveCount(0);
  }
  await lesson.getByRole("button", { name: "Periksa jawaban", exact: true }).click();
  await expect(lesson.locator('[data-companion][data-character="rara"]:visible')).toBeVisible();
  await expect(lesson.locator("[data-awarded-xp]")).toHaveCount(0);
  await expect(lesson.getByText("XP dihitung di akhir level", { exact: true })).toBeVisible();
  await expect(lesson.locator("[data-confetti]")).toHaveCount(0);
  await lesson.getByRole("button", { name: "Lanjut", exact: true }).evaluate((button: HTMLButtonElement) => {
    button.click();
    button.click();
  });
  await expect(lesson.getByRole("heading", { name: lessonFixture.questions[1].prompt })).toBeVisible();
  await expect(lesson.locator('[data-companion][data-character-context="question"]:visible')).toBeVisible();
  expect(attempts).toBe(4);
});

test("keyboard answers and reduced-motion reactions preserve server-awarded zero XP", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.route("**/api/lesson-sessions", (route) => route.fulfill({ status: 201, json: singleQuestionLesson }));
  await page.route("**/api/lesson-sessions/*/answer", (route) => route.fulfill({ status: 200, json: {
    questionId: lessonFixture.questions[0].id,
    correct: true,
    correctOptionId: lessonFixture.questions[0].options[0].id,
    explanation: "Konsepnya sudah tepat.",
    completed: true,
    award: { xpEarned: 0, score: 100, stats: dashboardFixture.stats, completedStageIds: dashboardFixture.progress.completedStageIds },
    progress: dashboardFixture.progress,
  } }));
  await page.goto("/", { waitUntil: "networkidle" });
  const lesson = await enterQuiz(page, /^Hubungkan ide/);
  const answers = lesson.getByRole("radio");
  await answers.first().focus();
  await answers.first().press("ArrowDown");
  await expect(answers.nth(1)).toBeFocused();
  await expect(answers.nth(1)).toHaveAttribute("aria-checked", "true");
  await answers.nth(1).press("Home");
  await expect(answers.first()).toHaveAttribute("aria-checked", "true");
  await lesson.getByRole("button", { name: "Periksa jawaban", exact: true }).click();
  const companion = lesson.locator('[data-companion][data-character="putri"]:visible');
  await expect(companion).toHaveAttribute("data-emotion", "happy");
  await expect(companion.locator("[data-companion-frame]")).toHaveCount(1);
  await expect(companion.locator("[data-companion-frame]")).toHaveCSS("transform", "none");
  await expect(lesson.locator("[data-confetti]")).toHaveCount(0);
  await expect(lesson.locator('[data-awarded-xp="0"]')).toContainText("+0 XP");
  await expect(lesson.getByRole("button", { name: "Lihat hasil", exact: true })).toBeFocused();
});
