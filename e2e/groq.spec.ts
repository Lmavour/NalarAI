import Groq, { APIError } from "groq-sdk";
import type { ChatCompletionChunk } from "groq-sdk/resources/chat/completions";
import { expect, test } from "@playwright/test";
import { GROQ_MAX_COMPLETION_TOKENS, GROQ_MODELS } from "../src/lib/ai-config";
import { estimateGroqReservation, getAvailableGroqModels, requestGroqLesson, type GroqCreateCompletion } from "../src/lib/groq";
import { generateWithProviders } from "../src/lib/ai-router";
import { LESSON_SYSTEM_PROMPT } from "../src/lib/lesson-content";

const model = GROQ_MODELS[0];
const request = { apiKey: "gsk_test-only-not-a-real-key-for-unit-tests", model, prompt: "Return a JSON object.", systemInstruction: LESSON_SYSTEM_PROMPT };

function chunk(content: string | null, finish: "stop" | "length" | null = null, usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }): ChatCompletionChunk {
  return { id: "test", model, object: "chat.completion.chunk", created: 0, choices: [{ index: 0, delta: { content, reasoning: "must-not-be-returned" }, finish_reason: finish }], ...(usage ? { x_groq: { usage } } : {}) };
}

function stream(chunks: ChatCompletionChunk[]): GroqCreateCompletion {
  return async () => (async function* () { for (const item of chunks) yield item; })();
}

test("Groq streaming uses the requested JSON and token contract", async () => {
  let captured: Parameters<GroqCreateCompletion>[0] | undefined;
  let signal: AbortSignal | undefined;
  const createCompletion: GroqCreateCompletion = async (params, options) => {
    captured = params;
    signal = options.signal;
    return (async function* () {
      yield chunk('{"ok":');
      yield chunk("true}", "stop");
      yield { ...chunk(null), choices: [], x_groq: { usage: { prompt_tokens: 100, completion_tokens: 60, total_tokens: 160 } } };
    })();
  };
  const generated = await requestGroqLesson({ ...request, createCompletion });
  expect(captured).toMatchObject({
    model,
    messages: [{ role: "system", content: LESSON_SYSTEM_PROMPT }, { role: "user", content: request.prompt }],
    temperature: 1,
    max_completion_tokens: 2048,
    top_p: 1,
    stream: true,
    reasoning_effort: "medium",
    include_reasoning: false,
    response_format: { type: "json_object" },
    stop: null,
  });
  expect(signal).toBeInstanceOf(AbortSignal);
  expect(generated.text).toBe('{"ok":true}');
  expect(generated.usage).toEqual({ inputTokens: 100, outputTokens: 60, totalTokens: 160 });
  expect(generated.text).not.toContain("must-not-be-returned");
});

test("Groq input reservations use UTF-8 bytes rather than a chars/4 estimate", () => {
  expect(estimateGroqReservation("abc", "def")).toBe(6 + 1024 + GROQ_MAX_COMPLETION_TOKENS);
  expect(estimateGroqReservation("a&+", LESSON_SYSTEM_PROMPT)).toBe(Buffer.byteLength("a&+", "utf8") + Buffer.byteLength(LESSON_SYSTEM_PROMPT, "utf8") + 1024 + 2048);
});

test("Groq rejects a truncated paid response while preserving its usage", async () => {
  await expect(requestGroqLesson({ ...request, createCompletion: stream([chunk('{"partial":', "length", { prompt_tokens: 100, completion_tokens: 2048, total_tokens: 2148 })]) })).rejects.toMatchObject({ kind: "invalid-response", usage: { inputTokens: 100, outputTokens: 2048, totalTokens: 2148 } });
});

test("Groq missing and inconsistent usage are not treated as zero-cost success", async () => {
  for (const chunks of [
    [chunk('{"ok":true}', "stop")],
    [chunk('{"ok":true}', "stop", { prompt_tokens: 1, completion_tokens: 2, total_tokens: 100 })],
    [chunk('{"ok":true}', "stop", { prompt_tokens: -1, completion_tokens: 2, total_tokens: 1 })],
  ]) {
    await expect(requestGroqLesson({ ...request, createCompletion: stream(chunks) })).rejects.toMatchObject({ kind: "invalid-response" });
  }
});

test("Groq stream errors retain only sanitized diagnostics and known usage", async () => {
  const failed = { ...chunk(null), x_groq: { error: "secret provider diagnostics", usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 } } };
  await expect(requestGroqLesson({ ...request, createCompletion: stream([failed]) })).rejects.toMatchObject({ kind: "upstream", message: "Groq stream ended with an error", usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 } });
});

test("Groq catches transport failures without retrying an unmetered request", async () => {
  let calls = 0;
  const createCompletion: GroqCreateCompletion = async () => { calls += 1; throw new APIError(429, {}, "private provider detail", new Headers()); };
  await expect(requestGroqLesson({ ...request, createCompletion })).rejects.toMatchObject({ kind: "upstream", status: 429, message: "Groq request failed" });
  expect(calls).toBe(1);
});

test("Groq aborts an oversized response and classifies an aborted stream", async () => {
  await expect(requestGroqLesson({ ...request, createCompletion: stream([chunk("x".repeat(512 * 1024 + 1))]) })).rejects.toMatchObject({ kind: "invalid-response" });
  const createCompletion: GroqCreateCompletion = async () => { throw new DOMException("Aborted", "AbortError"); };
  await expect(requestGroqLesson({ ...request, createCompletion })).rejects.toMatchObject({ kind: "timeout" });
});

test("rate-limited models are skipped in the cached pool without resetting budgets", async () => {
  const apiKey = "gsk_model-catalog-unit-test-not-a-real-key";
  let listings = 0;
  const listModels = async () => { listings += 1; return { data: GROQ_MODELS.map((id) => ({ id })) }; };
  expect(await getAvailableGroqModels(apiKey, [...GROQ_MODELS], listModels)).toEqual([...GROQ_MODELS]);
  const createCompletion: GroqCreateCompletion = async () => { throw new APIError(429, {}, "rate limited", new Headers()); };
  await expect(requestGroqLesson({ ...request, apiKey, createCompletion })).rejects.toMatchObject({ status: 429 });
  expect(await getAvailableGroqModels(apiKey, [...GROQ_MODELS], listModels)).toEqual(GROQ_MODELS.slice(1));
  expect(listings).toBe(1);
});

for (const liveModel of GROQ_MODELS) {
  test(`live Groq ${liveModel} generates a metered lesson`, async () => {
    test.skip(process.env.LIVE_GROQ_SMOKE !== "1", "Explicitly opt in to paid Groq calls and persistent quota accounting.");
    test.setTimeout(120_000);
    const { getAiProvidersConfig } = await import("../src/lib/env");
    const { getGroqTokenLedger } = await import("../src/lib/groq-budget-store");
    const config = getAiProvidersConfig();
    expect(config.groq, "GROQ_API_KEY is required").toBeTruthy();
    let diagnosticCreate: GroqCreateCompletion | undefined;
    if (process.env.DEBUG_GROQ_STREAM === "1") {
      const sdk = new Groq({ apiKey: config.groq!.apiKey, maxRetries: 0, timeout: 45_000 });
      const describe = (error: unknown) => {
        const message = error instanceof Error ? error.message : "";
        const data = error as { status?: number; error?: { code?: string } };
        const allowed = ["json_validate_failed", "rate_limit_exceeded", "model_not_found", "invalid_request_error"];
        console.warn("Groq stream diagnostic:", { errorType: error instanceof Error ? error.constructor.name : typeof error, status: data.status, code: allowed.includes(data.error?.code ?? "") ? data.error?.code : "other", jsonFailure: /json|parse/i.test(message), parameterFailure: /include_reasoning|response_format|reasoning_effort/i.test(message), connectionFailure: /connect|socket|network/i.test(message) });
      };
      diagnosticCreate = async (params, options) => {
        try {
          const response = await sdk.chat.completions.create(params, options);
          return (async function* () {
            try { for await (const item of response) yield item; } catch (error) { describe(error); throw error; }
          })();
        } catch (error) { describe(error); throw error; }
      };
    }
    const generated = await generateWithProviders("Fotosintesis", "Fondasi", { groq: { ...config.groq!, models: [liveModel] }, gemini: null }, { getLedger: getGroqTokenLedger, groq: diagnosticCreate ? (params) => requestGroqLesson({ ...params, createCompletion: diagnosticCreate }) : undefined });
    expect(generated.generation.provider).toBe("groq");
    expect(generated.generation.model).toBe(liveModel);
    expect(generated.generation.usage?.totalTokens).toBeGreaterThan(0);
    console.log("Live Groq metered lesson:", { model: liveModel, material: generated.content.material.length, questions: generated.content.quiz.length, usage: generated.generation.usage });
  });
}

test("inspect live Groq budget accounting without dispatching generation", async () => {
  test.skip(process.env.INSPECT_GROQ_BUDGET !== "1", "Explicitly opt in to read-only quota diagnostics.");
  const { connectToDatabase } = await import("../src/lib/db");
  const db = await connectToDatabase();
  const rows = await db.connection.collection("aitokenbudgets").find({ utcDay: new Date().toISOString().slice(0, 10) }, {
    projection: { _id: 0, modelId: 1, accountedTokens: 1, reservedTokens: 1, blocked: 1, overrunTokens: 1, reservations: { $slice: -2 } },
  }).toArray();
  console.log("Groq accounting diagnostic:", rows.map((row) => ({
    model: row.modelId, accounted: row.accountedTokens, reserved: row.reservedTokens, blocked: row.blocked, overrun: row.overrunTokens,
    recent: (row.reservations as Array<{ amount: number; state: string; chargedTokens?: number; inputTokens?: number; outputTokens?: number }>).map(({ amount, state, chargedTokens, inputTokens, outputTokens }) => ({ amount, state, chargedTokens, inputTokens, outputTokens })),
  })));
});

test("live Gemini fallback remains available when Groq daily admission is exhausted", async () => {
  test.skip(process.env.LIVE_PROVIDER_FALLBACK !== "1", "Explicitly opt in to a real fallback generation.");
  test.setTimeout(120_000);
  const { getAiProvidersConfig } = await import("../src/lib/env");
  const { getGroqTokenLedger } = await import("../src/lib/groq-budget-store");
  const config = getAiProvidersConfig();
  expect(config.groq).toBeTruthy();
  expect(config.gemini).toBeTruthy();
  const generated = await generateWithProviders("Fotosintesis", "Fondasi", { ...config, groq: { ...config.groq!, dailyTokenLimit: 1 } }, { getLedger: getGroqTokenLedger });
  expect(generated.generation.provider).toBe("gemini");
  console.log("Live provider fallback validated:", { provider: generated.generation.provider, model: generated.generation.model, material: generated.content.material.length, questions: generated.content.quiz.length, usage: generated.generation.usage });
});
