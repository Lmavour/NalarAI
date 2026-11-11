import { ApiError, GoogleGenAI, ThinkingLevel } from "@google/genai";
import { DEFAULT_GEMINI_MODEL, type TokenUsage } from "@/lib/ai-config";
import { AiServiceError } from "@/lib/ai-error";
import { LESSON_RESPONSE_JSON_SCHEMA } from "@/lib/lesson-content";

export { DEFAULT_GEMINI_MODEL, AiServiceError };
export const GEMINI_TEMPERATURE = 0.7;
const MAX_RESPONSE_BYTES = 512 * 1024;
const REQUEST_TIMEOUT_MS = 90_000;

type GenerateContent = GoogleGenAI["models"]["generateContent"];
export type GeminiGenerateContent = (params: Parameters<GenerateContent>[0]) => ReturnType<GenerateContent>;
export type GeminiAttachment = { mimeType: string; data: string };

type GeminiRequest = {
  apiKey: string;
  model: string;
  prompt: string;
  systemInstruction: string;
  generateContent?: GeminiGenerateContent;
  onUsage?: (usage: TokenUsage | null) => void;
  responseJsonSchema?: Record<string, unknown>;
  attachments?: GeminiAttachment[];
  maxOutputTokens?: number;
  temperature?: number;
};

export async function requestGeminiLesson({ apiKey, model, prompt, systemInstruction, generateContent, onUsage, responseJsonSchema, attachments = [], maxOutputTokens = 8192, temperature = GEMINI_TEMPERATURE }: GeminiRequest) {
  const client = generateContent ? null : new GoogleGenAI({
    apiKey,
    httpOptions: {
      timeout: REQUEST_TIMEOUT_MS,
      retryOptions: { attempts: 2, initialDelay: 0.5, maxDelay: 2, expBase: 2, jitter: 0.2 },
    },
  });
  const generate = generateContent ?? client!.models.generateContent.bind(client!.models);

  try {
    const response = await generate({
      model,
      contents: [{ role: "user", parts: [...attachments.map((inlineData) => ({ inlineData })), { text: prompt }] }],
      config: {
        systemInstruction,
        temperature,
        thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
        responseMimeType: "application/json",
        responseJsonSchema: responseJsonSchema ?? LESSON_RESPONSE_JSON_SCHEMA,
        maxOutputTokens,
        httpOptions: { timeout: REQUEST_TIMEOUT_MS },
      },
    });
    const input = response.usageMetadata?.promptTokenCount;
    const total = response.usageMetadata?.totalTokenCount;
    const usage = input !== undefined && total !== undefined && Number.isSafeInteger(input) && Number.isSafeInteger(total) && input >= 0 && total >= input
      ? { inputTokens: input, outputTokens: total - input, totalTokens: total }
      : null;
    onUsage?.(usage);
    const finish = response.candidates?.[0]?.finishReason;
    if (finish && finish !== "STOP") throw new AiServiceError("Gemini response did not complete", "invalid-response", undefined, usage ?? undefined);
    const text = response.text?.trim();
    if (!text || Buffer.byteLength(text, "utf8") > MAX_RESPONSE_BYTES) {
      throw new AiServiceError("Gemini response is empty or too large", "invalid-response");
    }
    return text;
  } catch (error) {
    if (error instanceof AiServiceError) throw error;
    if (error instanceof ApiError) throw new AiServiceError("Gemini API request failed", "upstream", error.status);
    if (error instanceof Error && /abort|timeout/i.test(`${error.name} ${error.message}`)) throw new AiServiceError("Gemini request timed out", "timeout");
    throw new AiServiceError("Gemini request failed", "upstream");
  }
}
