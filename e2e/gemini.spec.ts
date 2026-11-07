import { ApiError, ThinkingLevel, type GenerateContentResponse } from "@google/genai";
import { expect, test } from "@playwright/test";
import { DEFAULT_GEMINI_MODEL, GEMINI_TEMPERATURE, requestGeminiLesson, type GeminiGenerateContent } from "../src/lib/gemini";
import { buildLessonPrompt, LESSON_RESPONSE_JSON_SCHEMA, LESSON_SYSTEM_PROMPT, parseLessonContent } from "../src/lib/lesson-content";

const apiKey = "test-only-key-with-sufficient-length";
const prompt = buildLessonPrompt("Fotosintesis", "Fondasi");
const validLesson = JSON.stringify({
  title: "Fondasi fotosintesis",
  overview: "Pahami bagaimana tumbuhan menyimpan energi cahaya dalam bentuk energi kimia.",
  estimatedMinutes: 6,
  material: Array.from({ length: 3 }, (_, index) => ({ title: `Konsep ${index + 1}`, content: "Klorofil menangkap energi cahaya dan membantu tumbuhan menyimpan energi tersebut dalam gula yang dapat digunakan.", keyTakeaway: "Fotosintesis mengubah energi cahaya menjadi energi kimia." })),
  quiz: Array.from({ length: 4 }, (_, index) => ({ question: `Apa fungsi klorofil pada pertanyaan ${index + 1}?`, options: ["Menangkap cahaya", "Membuat batu", "Menghilangkan air", "Mematikan sel"], correctAnswer: 0, explanation: "Klorofil menangkap energi cahaya untuk membantu proses fotosintesis." })),
});

function mockGenerator(text: string) {
  return (async () => ({ text } as unknown as GenerateContentResponse)) as GeminiGenerateContent;
}

test("Gemini requests use the requested model and structured generation contract", async () => {
  expect(DEFAULT_GEMINI_MODEL).toBe("gemini-3.5-flash-lite");
  expect(GEMINI_TEMPERATURE).toBe(0.7);
  let captured: Parameters<GeminiGenerateContent>[0] | undefined;
  const generateContent = (async (params: Parameters<GeminiGenerateContent>[0]) => { captured = params; return { text: validLesson } as unknown as GenerateContentResponse; }) as GeminiGenerateContent;
  const result = await requestGeminiLesson({ apiKey, model: DEFAULT_GEMINI_MODEL, prompt, systemInstruction: LESSON_SYSTEM_PROMPT, generateContent });
  expect(result).toBe(validLesson);
  expect(captured).toMatchObject({
    model: "gemini-3.5-flash-lite",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      systemInstruction: LESSON_SYSTEM_PROMPT,
      temperature: 0.7,
      thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
      responseMimeType: "application/json",
      responseJsonSchema: LESSON_RESPONSE_JSON_SCHEMA,
      maxOutputTokens: 8192,
    },
  });
});

test("Gemini accepts a bounded structured response and rejects empty or oversized text", async () => {
  await expect(requestGeminiLesson({ apiKey, model: DEFAULT_GEMINI_MODEL, prompt, systemInstruction: LESSON_SYSTEM_PROMPT, generateContent: mockGenerator(validLesson) })).resolves.toBe(validLesson);
  for (const text of ["", " ", "x".repeat(512 * 1024 + 1)]) {
    await expect(requestGeminiLesson({ apiKey, model: DEFAULT_GEMINI_MODEL, prompt, systemInstruction: LESSON_SYSTEM_PROMPT, generateContent: mockGenerator(text) })).rejects.toMatchObject({ kind: "invalid-response" });
  }
});

test("Gemini errors are sanitized and preserve only useful classifications", async () => {
  const upstream = (async () => { throw new ApiError({ status: 429, message: "provider details" }); }) as GeminiGenerateContent;
  await expect(requestGeminiLesson({ apiKey, model: DEFAULT_GEMINI_MODEL, prompt, systemInstruction: LESSON_SYSTEM_PROMPT, generateContent: upstream })).rejects.toMatchObject({ name: "AiServiceError", kind: "upstream", status: 429, message: "Gemini API request failed" });

  const timeout = (async () => { throw new Error("request timeout with private details"); }) as GeminiGenerateContent;
  await expect(requestGeminiLesson({ apiKey, model: DEFAULT_GEMINI_MODEL, prompt, systemInstruction: LESSON_SYSTEM_PROMPT, generateContent: timeout })).rejects.toMatchObject({ kind: "timeout", message: "Gemini request timed out" });

  const network = (async () => { throw new Error("private socket failure"); }) as GeminiGenerateContent;
  await expect(requestGeminiLesson({ apiKey, model: DEFAULT_GEMINI_MODEL, prompt, systemInstruction: LESSON_SYSTEM_PROMPT, generateContent: network })).rejects.toMatchObject({ kind: "upstream", message: "Gemini request failed" });
});

test("live Gemini generates a lesson through the production SDK contract", async () => {
  test.skip(process.env.LIVE_AI_SMOKE !== "1", "Explicitly opt in to calling Gemini.");
  test.setTimeout(120_000);
  const configuredKey = process.env.GEMINI_API_KEY;
  expect(configuredKey, "GEMINI_API_KEY is required for a live smoke test").toBeTruthy();
  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
  const started = Date.now();
  const response = await requestGeminiLesson({ apiKey: configuredKey!, model, prompt, systemInstruction: LESSON_SYSTEM_PROMPT });
  const lesson = parseLessonContent(response);
  console.log("Live Gemini lesson validated:", { model, materialCount: lesson.material.length, questionCount: lesson.quiz.length, elapsedMs: Date.now() - started });
});
