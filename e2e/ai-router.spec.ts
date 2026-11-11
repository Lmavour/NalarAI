import { expect, test } from "@playwright/test";
import { GROQ_MODELS, type AiProvidersConfig, type GroqModel } from "../src/lib/ai-config";
import { AiServiceError } from "../src/lib/ai-error";
import { generateWithProviders } from "../src/lib/ai-router";
import { GroqTokenLedger } from "../src/lib/groq-budget";
import { FakeQuotaCollection } from "./fixtures/fake-groq-ledger";

const now = new Date("2026-11-07T12:00:00.000Z");
const content = JSON.stringify({
  title: "Fondasi fotosintesis",
  overview: "Pahami bagaimana tumbuhan menyimpan energi cahaya sebagai energi kimia.",
  estimatedMinutes: 6,
  material: Array.from({ length: 3 }, () => ({ title: "Energi cahaya", content: "Klorofil menyerap cahaya, lalu tumbuhan memanfaatkan energinya untuk menyusun gula dari air dan karbon dioksida di dalam daun.", keyTakeaway: "Fotosintesis menyimpan energi cahaya di dalam gula." })),
  quiz: Array.from({ length: 4 }, () => ({ question: "Apa fungsi utama klorofil pada tumbuhan?", options: ["Menangkap cahaya", "Menghasilkan batu", "Mengubah tanah", "Menyimpan panas"], correctAnswer: 0, explanation: "Klorofil menangkap cahaya sebagai sumber energi untuk fotosintesis." })),
});

function context() {
  const storage = new FakeQuotaCollection();
  const groqCalls: GroqModel[] = [];
  let geminiCalls = 0;
  const config: AiProvidersConfig = { groq: { apiKey: "gsk_unit-test-private-key", models: [...GROQ_MODELS], dailyTokenLimit: 200000 }, gemini: { apiKey: "gemini-unit-test-private-key", model: "gemini-test" } };
  const dependencies: Parameters<typeof generateWithProviders>[3] = {
    getLedger: async (limit) => new GroqTokenLedger(storage, limit),
    groqModels: async (_key, models) => models,
    groq: async (request) => { groqCalls.push(request.model); return { provider: "groq", model: request.model, text: content, usage: { inputTokens: 100, outputTokens: 200, totalTokens: 300 } }; },
    gemini: async (request) => { geminiCalls += 1; request.onUsage?.({ inputTokens: 400, outputTokens: 500, totalTokens: 900 }); return content; },
    now: () => new Date(now),
    warn: () => {},
  };
  return { storage, groqCalls, config, dependencies, geminiCalls: () => geminiCalls };
}

test("Groq admission is metered before dispatch and metadata contains no credentials", async () => {
  const ctx = context();
  ctx.dependencies.groq = async (request) => {
    const doc = [...ctx.storage.documents.values()].find((row) => row.modelId === request.model)!;
    expect(doc.reservedTokens).toBeGreaterThan(2048);
    expect(doc.accountedTokens).toBe(0);
    return { provider: "groq", model: request.model, text: content, usage: { inputTokens: 100, outputTokens: 200, totalTokens: 300 } };
  };
  const generated = await generateWithProviders("Fotosintesis", "Fondasi", ctx.config, ctx.dependencies);
  expect(generated.generation.provider).toBe("groq");
  expect(generated.content.quiz).toHaveLength(4);
  expect(JSON.stringify(generated)).not.toContain(ctx.config.groq!.apiKey);
  expect(JSON.stringify(generated)).not.toContain(ctx.config.gemini!.apiKey);
  expect([...ctx.storage.documents.values()].reduce((sum, row) => sum + row.accountedTokens, 0)).toBe(300);
  expect([...ctx.storage.documents.values()].every((row) => row.reservedTokens === 0)).toBe(true);
  expect(ctx.geminiCalls()).toBe(0);
});

test("normal generations rotate through the least-used model pool", async () => {
  const ctx = context();
  for (let index = 0; index < 6; index += 1) await generateWithProviders("Fotosintesis", "Fondasi", ctx.config, ctx.dependencies);
  expect(ctx.groqCalls).toEqual([...GROQ_MODELS, ...GROQ_MODELS]);
  expect(ctx.geminiCalls()).toBe(0);
});

test("concurrent users share the same persisted model budgets", async () => {
  const ctx = context();
  ctx.storage.failAfterWrite = () => {
    for (const row of ctx.storage.documents.values()) expect(row.accountedTokens + row.reservedTokens).toBeLessThanOrEqual(200000);
  };
  const results = await Promise.all(Array.from({ length: 60 }, () => generateWithProviders("Fotosintesis", "Fondasi", ctx.config, ctx.dependencies)));
  expect(results.every((row) => row.generation.provider === "groq")).toBe(true);
  expect(ctx.groqCalls).toHaveLength(60);
  expect([...ctx.storage.documents.values()].reduce((sum, row) => sum + row.accountedTokens, 0)).toBe(60 * 300);
});

test("exhausted Groq budgets fall back to Gemini with actual usage metadata", async () => {
  const ctx = context();
  ctx.config.groq!.dailyTokenLimit = 1;
  ctx.dependencies.getLedger = async () => { throw new Error("An unaffordable request must not need quota storage"); };
  const generated = await generateWithProviders("Fotosintesis", "Fondasi", ctx.config, ctx.dependencies);
  expect(generated.generation).toEqual({ provider: "gemini", model: "gemini-test", usage: { inputTokens: 400, outputTokens: 500, totalTokens: 900 } });
  expect(ctx.groqCalls).toHaveLength(0);
  expect(ctx.geminiCalls()).toBe(1);
});

test("exhaustion without a fallback returns a daily quota error", async () => {
  const ctx = context();
  ctx.config.groq!.dailyTokenLimit = 1;
  ctx.config.gemini = null;
  await expect(generateWithProviders("Fotosintesis", "Fondasi", ctx.config, ctx.dependencies)).rejects.toMatchObject({ kind: "budget-exhausted", status: 429 });
  expect(ctx.groqCalls).toHaveLength(0);
});

test("unverified model availability never sends an unmetered Groq request", async () => {
  const ctx = context();
  ctx.dependencies.groqModels = async () => { throw new AiServiceError("Catalog unavailable", "upstream", 401); };
  const generated = await generateWithProviders("Fotosintesis", "Fondasi", ctx.config, ctx.dependencies);
  expect(generated.generation.provider).toBe("gemini");
  expect(ctx.groqCalls).toHaveLength(0);
  expect(ctx.storage.writes).toHaveLength(0);
});

test("a paid malformed lesson is charged before rotating to the next model", async () => {
  const ctx = context();
  ctx.dependencies.groq = async (request) => {
    ctx.groqCalls.push(request.model);
    return { provider: "groq", model: request.model, text: ctx.groqCalls.length === 1 ? "not lesson JSON" : content, usage: { inputTokens: 100, outputTokens: 200, totalTokens: 300 } };
  };
  const generated = await generateWithProviders("Fotosintesis", "Fondasi", ctx.config, ctx.dependencies);
  expect(ctx.groqCalls).toEqual([GROQ_MODELS[0], GROQ_MODELS[1]]);
  expect(generated.generation.model).toBe(GROQ_MODELS[1]);
  expect([...ctx.storage.documents.values()].reduce((sum, row) => sum + row.accountedTokens, 0)).toBe(600);
});

test("unknown failures conservatively consume reservations before fallback", async () => {
  const ctx = context();
  ctx.dependencies.groq = async (request) => { ctx.groqCalls.push(request.model); throw new AiServiceError("Timed out", "timeout"); };
  const generated = await generateWithProviders("Fotosintesis", "Fondasi", ctx.config, ctx.dependencies);
  expect(generated.generation.provider).toBe("gemini");
  expect(ctx.groqCalls).toEqual([...GROQ_MODELS]);
  for (const row of ctx.storage.documents.values()) {
    expect(row.reservedTokens).toBe(0);
    expect(row.accountedTokens).toBeGreaterThan(2048);
    expect(row.measuredInputTokens + row.measuredOutputTokens).toBe(0);
    expect(row.reservations[0].state).toBe("charged");
  }
});

for (const position of ["before", "after"] as const) {
  test(`database failure ${position} reservation commit dispatches no Groq request`, async () => {
    const ctx = context();
    const hook = (write: Parameters<NonNullable<typeof ctx.storage.failBeforeWrite>>[0]) => {
      if (write.update.$push) throw new Error("Database unavailable");
    };
    if (position === "before") ctx.storage.failBeforeWrite = hook;
    else ctx.storage.failAfterWrite = hook;
    const generated = await generateWithProviders("Fotosintesis", "Fondasi", ctx.config, ctx.dependencies);
    expect(generated.generation.provider).toBe("gemini");
    expect(ctx.groqCalls).toHaveLength(0);
    const held = [...ctx.storage.documents.values()].reduce((sum, row) => sum + row.reservedTokens, 0);
    expect(position === "after" ? held > 0 : held === 0).toBe(true);
  });
}

test("lost settlement acknowledgement preserves the charge and stops further Groq dispatch", async () => {
  const ctx = context();
  ctx.storage.failAfterWrite = (write) => { if (write.filter.reservations) return { acknowledged: false, modifiedCount: 1 }; };
  const generated = await generateWithProviders("Fotosintesis", "Fondasi", ctx.config, ctx.dependencies);
  expect(generated.generation.provider).toBe("gemini");
  expect(ctx.groqCalls).toHaveLength(1);
  expect([...ctx.storage.documents.values()].reduce((sum, row) => sum + row.accountedTokens, 0)).toBe(300);
});

test("usage above its reservation quarantines the model before another dispatch", async () => {
  const ctx = context();
  ctx.dependencies.groq = async (request) => {
    ctx.groqCalls.push(request.model);
    const held = [...ctx.storage.documents.values()].find((row) => row.modelId === request.model)!.reservedTokens;
    return { provider: "groq", model: request.model, text: content, usage: { inputTokens: held, outputTokens: 1, totalTokens: held + 1 } };
  };
  const generated = await generateWithProviders("Fotosintesis", "Fondasi", ctx.config, ctx.dependencies);
  expect(generated.generation.provider).toBe("gemini");
  expect(ctx.groqCalls).toHaveLength(1);
  expect([...ctx.storage.documents.values()].some((row) => row.blocked)).toBe(true);
});

test("midnight admission releases unused old-day quota and meters the new day", async () => {
  const ctx = context();
  let ticks = 0;
  ctx.dependencies.now = () => new Date(ticks++ === 0 ? "2026-11-07T23:59:59.990Z" : "2026-11-08T00:00:00.001Z");
  const generated = await generateWithProviders("Fotosintesis", "Fondasi", ctx.config, ctx.dependencies);
  expect(generated.generation.provider).toBe("groq");
  const old = [...ctx.storage.documents.values()].filter((row) => row.utcDay === "2026-11-07");
  const fresh = [...ctx.storage.documents.values()].filter((row) => row.utcDay === "2026-11-08");
  expect(old.every((row) => row.reservedTokens + row.accountedTokens === 0)).toBe(true);
  expect(fresh.reduce((sum, row) => sum + row.accountedTokens, 0)).toBe(300);
  expect(ctx.groqCalls).toHaveLength(1);
});

test("an input bound beyond the Groq context does not invoke the pool", async () => {
  const ctx = context();
  const generated = await generateWithProviders("x".repeat(131072), "Fondasi", ctx.config, ctx.dependencies);
  expect(generated.generation.provider).toBe("gemini");
  expect(ctx.groqCalls).toHaveLength(0);
  expect(ctx.storage.writes).toHaveLength(0);
});

test("Gemini-only operation does not initialize Groq quota storage", async () => {
  const ctx = context();
  ctx.config.groq = null;
  const generated = await generateWithProviders("Fotosintesis", "Fondasi", ctx.config, ctx.dependencies);
  expect(generated.generation.provider).toBe("gemini");
  expect(ctx.storage.documents.size).toBe(0);
  expect(ctx.groqCalls).toHaveLength(0);
});

test("a final invalid Gemini response and provider rate limits remain errors", async () => {
  const ctx = context();
  ctx.config.groq = null;
  ctx.dependencies.gemini = async () => "not JSON";
  await expect(generateWithProviders("Fotosintesis", "Fondasi", ctx.config, ctx.dependencies)).rejects.toMatchObject({ kind: "invalid-response" });
  ctx.dependencies.gemini = async () => { throw new AiServiceError("Rate limited", "upstream", 429); };
  await expect(generateWithProviders("Fotosintesis", "Fondasi", ctx.config, ctx.dependencies)).rejects.toMatchObject({ status: 429 });
});
