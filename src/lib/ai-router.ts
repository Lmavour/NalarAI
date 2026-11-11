import { type AiGeneration, type AiProvidersConfig, type GroqModel, type TokenUsage } from "@/lib/ai-config";
import { AiServiceError } from "@/lib/ai-error";
import { requestGeminiLesson } from "@/lib/gemini";
import { estimateGroqReservation, getAvailableGroqModels, requestGroqLesson } from "@/lib/groq";
import { getQuotaDay, type GroqTokenLedger } from "@/lib/groq-budget";
import { buildLessonPrompt, LESSON_SYSTEM_PROMPT, parseLessonContent } from "@/lib/lesson-content";

type RouterDependencies = {
  getLedger: (limit: number) => Promise<GroqTokenLedger>;
  groqModels?: typeof getAvailableGroqModels;
  groq?: typeof requestGroqLesson;
  gemini?: typeof requestGeminiLesson;
  now?: () => Date;
  warn?: (details: { provider: string; model?: string; kind: string; status?: number }) => void;
};

function parseGeneration(generation: AiGeneration) {
  try {
    return parseLessonContent(generation.text);
  } catch {
    throw new AiServiceError("AI lesson JSON failed validation", "invalid-response", undefined, generation.usage ?? undefined);
  }
}

export async function generateWithProviders(topic: string, stageTitle: string, config: AiProvidersConfig, dependencies: RouterDependencies) {
  const now = dependencies.now ?? (() => new Date());
  const warn = dependencies.warn ?? ((details) => console.warn("AI provider fallback:", details));
  let lastError: AiServiceError | null = null;
  let exhausted = false;

  if (config.groq) {
    const prompt = buildLessonPrompt(topic, stageTitle, true);
    const amount = estimateGroqReservation(prompt, LESSON_SYSTEM_PROMPT);
    try {
      const available = await (dependencies.groqModels ?? getAvailableGroqModels)(config.groq.apiKey, config.groq.models);
      if (amount > config.groq.dailyTokenLimit) {
        exhausted = true;
      } else if (available.length && amount <= 131_072) {
        const ledger = await dependencies.getLedger(config.groq.dailyTokenLimit);
        const attempted = new Set<GroqModel>();
        while (attempted.size < available.length) {
          const candidates = available.filter((model) => !attempted.has(model));
          let reservation = await ledger.reserve(candidates, amount, now());
          if (!reservation) { exhausted = true; break; }

          // A slow quota write crossing midnight must not spend the previous day's allowance.
          if (reservation.utcDay !== getQuotaDay(now())) {
            await ledger.settle(reservation, { inputTokens: 0, outputTokens: 0, totalTokens: 0 }, now());
            reservation = await ledger.reserve(candidates, amount, now());
            if (!reservation) { exhausted = true; break; }
            if (reservation.utcDay !== getQuotaDay(now())) {
              await ledger.settle(reservation, { inputTokens: 0, outputTokens: 0, totalTokens: 0 }, now());
              throw new Error("Quota admission crossed the day boundary repeatedly");
            }
          }
          attempted.add(reservation.model);

          let generation: AiGeneration;
          try {
            generation = await (dependencies.groq ?? requestGroqLesson)({
              apiKey: config.groq.apiKey,
              model: reservation.model,
              prompt,
              systemInstruction: LESSON_SYSTEM_PROMPT,
            });
          } catch (error) {
            const failure = error instanceof AiServiceError ? error : new AiServiceError("Groq request failed", "upstream");
            await ledger.settle(reservation, failure.usage ?? null, now());
            lastError = failure;
            warn({ provider: "groq", model: reservation.model, kind: failure.kind, status: failure.status });
            continue;
          }

          // Paid responses consume quota even when their generated lesson fails validation.
          await ledger.settle(reservation, generation.usage, now());
          try {
            const content = parseGeneration(generation);
            return { content, generation: { provider: generation.provider, model: generation.model, usage: generation.usage, reservationId: reservation.id, quotaDay: reservation.utcDay } };
          } catch (error) {
            lastError = error as AiServiceError;
            warn({ provider: "groq", model: reservation.model, kind: lastError.kind });
          }
        }
      } else {
        lastError = new AiServiceError("No verified Groq model is available", "upstream");
      }
    } catch (error) {
      lastError = error instanceof AiServiceError ? error : new AiServiceError("Groq quota storage is unavailable", "upstream");
      warn({ provider: "groq", kind: error instanceof AiServiceError ? error.kind : "budget-store", status: lastError.status });
    }
  }

  if (config.gemini) {
    let usage: TokenUsage | null = null;
    const text = await (dependencies.gemini ?? requestGeminiLesson)({
      apiKey: config.gemini.apiKey,
      model: config.gemini.model,
      prompt: buildLessonPrompt(topic, stageTitle),
      systemInstruction: LESSON_SYSTEM_PROMPT,
      onUsage: (reported) => { usage = reported; },
    });
    const generation: AiGeneration = { provider: "gemini", model: config.gemini.model, text, usage };
    return { content: parseGeneration(generation), generation: { provider: generation.provider, model: generation.model, usage: generation.usage } };
  }

  if (exhausted) throw new AiServiceError("All Groq daily token budgets are exhausted", "budget-exhausted", 429);
  throw lastError ?? new AiServiceError("No AI provider is available", "upstream");
}
