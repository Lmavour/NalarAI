import { createHash } from "node:crypto";
import Groq, { APIError, APIConnectionTimeoutError } from "groq-sdk";
import type { ChatCompletionChunk, ChatCompletionCreateParamsStreaming } from "groq-sdk/resources/chat/completions";
import { GROQ_MAX_COMPLETION_TOKENS, type AiGeneration, type GroqModel, type TokenUsage } from "@/lib/ai-config";
import { AiServiceError } from "@/lib/ai-error";

const REQUEST_TIMEOUT_MS = 45_000;
const MAX_RESPONSE_BYTES = 512 * 1024;
const catalogCache = new Map<string, { expiresAt: number; models: Promise<Set<string>> }>();

export type GroqCreateCompletion = (params: ChatCompletionCreateParamsStreaming, options: { signal: AbortSignal }) => Promise<AsyncIterable<ChatCompletionChunk>>;

/** Text-only requests reserve a byte-level input upper bound plus fixed chat framing. */
export function estimateGroqReservation(prompt: string, systemInstruction: string) {
  return Buffer.byteLength(prompt, "utf8") + Buffer.byteLength(systemInstruction, "utf8") + 1024 + GROQ_MAX_COMPLETION_TOKENS;
}

export async function getAvailableGroqModels(apiKey: string, configured: GroqModel[], listModels?: () => Promise<{ data: Array<{ id: string }> }>) {
  const key = createHash("sha256").update(apiKey).digest("hex");
  let cached = catalogCache.get(key);
  if (!cached || cached.expiresAt <= Date.now()) {
    const client = listModels ? null : new Groq({ apiKey, maxRetries: 0, timeout: 20_000 });
    const models = (listModels ? listModels() : client!.models.list()).then((response) => new Set(response.data.map((model) => model.id)));
    cached = { expiresAt: Date.now() + 5 * 60_000, models };
    catalogCache.set(key, cached);
    void models.catch(() => { catalogCache.delete(key); });
  }
  try {
    const available = await cached.models;
    return configured.filter((model) => available.has(model));
  } catch (error) {
    throw new AiServiceError("Groq model catalog is unavailable", "upstream", error instanceof APIError ? error.status : undefined);
  }
}

type GroqRequest = {
  apiKey: string;
  model: GroqModel;
  prompt: string;
  systemInstruction: string;
  createCompletion?: GroqCreateCompletion;
};

export async function requestGroqLesson({ apiKey, model, prompt, systemInstruction, createCompletion }: GroqRequest): Promise<AiGeneration> {
  const client = createCompletion ? null : new Groq({ apiKey, timeout: REQUEST_TIMEOUT_MS, maxRetries: 0 });
  const create = createCompletion ?? ((params, options) => client!.chat.completions.create(params, options));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let text = "";
  let bytes = 0;
  let usage: TokenUsage | null = null;
  let finishReason: string | null = null;

  try {
    const stream = await create({
      model,
      messages: [{ role: "system", content: systemInstruction }, { role: "user", content: prompt }],
      temperature: 1,
      max_completion_tokens: GROQ_MAX_COMPLETION_TOKENS,
      top_p: 1,
      stream: true,
      reasoning_effort: "medium",
      include_reasoning: false,
      response_format: { type: "json_object" },
      stop: null,
    }, { signal: controller.signal });

    for await (const chunk of stream) {
      const reported = chunk.x_groq?.usage;
      if (reported) {
        const { prompt_tokens: input, completion_tokens: output, total_tokens: total } = reported;
        if (![input, output, total].every((value) => Number.isSafeInteger(value) && value >= 0) || input + output !== total || total === 0) {
          throw new AiServiceError("Groq usage metadata is invalid", "invalid-response");
        }
        usage = { inputTokens: input, outputTokens: output, totalTokens: total };
      }
      if (chunk.x_groq?.error) throw new AiServiceError("Groq stream ended with an error", "upstream", undefined, usage ?? undefined);
      const choice = chunk.choices.find((item) => item.index === 0);
      const delta = choice?.delta.content ?? "";
      text += delta;
      bytes += Buffer.byteLength(delta, "utf8");
      if (bytes > MAX_RESPONSE_BYTES) {
        controller.abort();
        throw new AiServiceError("Groq response is too large", "invalid-response", undefined, usage ?? undefined);
      }
      if (choice?.finish_reason) finishReason = choice.finish_reason;
    }

    if (!text.trim() || finishReason !== "stop" || !usage) {
      throw new AiServiceError("Groq response is incomplete or lacks usage", "invalid-response", undefined, usage ?? undefined);
    }
    return { provider: "groq", model, text: text.trim(), usage };
  } catch (error) {
    if (error instanceof AiServiceError) throw error;
    if (error instanceof APIError) {
      const key = createHash("sha256").update(apiKey).digest("hex");
      if (error.status === 401) catalogCache.delete(key);
      else if (error.status !== undefined && [403, 404, 429].includes(error.status)) {
        const cached = catalogCache.get(key);
        if (cached) {
          const available = await cached.models.catch(() => null);
          available?.delete(model);
        }
      }
    }
    if (controller.signal.aborted || error instanceof APIConnectionTimeoutError || (error instanceof Error && /abort|timeout/i.test(error.name))) {
      throw new AiServiceError("Groq request timed out", "timeout", undefined, usage ?? undefined);
    }
    throw new AiServiceError("Groq request failed", "upstream", error instanceof APIError ? error.status : undefined, usage ?? undefined);
  } finally {
    clearTimeout(timeout);
  }
}
