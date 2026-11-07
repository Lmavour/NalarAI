import { ApiError, GoogleGenAI, ThinkingLevel } from "@google/genai";
import { LESSON_RESPONSE_JSON_SCHEMA } from "@/lib/lesson-content";

export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";
export const GEMINI_TEMPERATURE = 0.7;
const MAX_RESPONSE_BYTES = 512 * 1024;
const REQUEST_TIMEOUT_MS = 90_000;

type GenerateContent = GoogleGenAI["models"]["generateContent"];
export type GeminiGenerateContent = (params: Parameters<GenerateContent>[0]) => ReturnType<GenerateContent>;

export class AiServiceError extends Error {
  readonly kind: "timeout" | "upstream" | "invalid-response";
  readonly status?: number;

  constructor(message: string, kind: AiServiceError["kind"], status?: number) {
    super(message);
    this.name = "AiServiceError";
    this.kind = kind;
    this.status = status;
  }
}

type GeminiRequest = {
  apiKey: string;
  model: string;
  prompt: string;
  systemInstruction: string;
  generateContent?: GeminiGenerateContent;
};

export async function requestGeminiLesson({ apiKey, model, prompt, systemInstruction, generateContent }: GeminiRequest) {
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
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        systemInstruction,
        temperature: GEMINI_TEMPERATURE,
        thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
        responseMimeType: "application/json",
        responseJsonSchema: LESSON_RESPONSE_JSON_SCHEMA,
        maxOutputTokens: 8_192,
        httpOptions: { timeout: REQUEST_TIMEOUT_MS },
      },
    });
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
