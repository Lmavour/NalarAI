export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";
export const GROQ_MODELS = ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.8-27b"] as const;
export type GroqModel = typeof GROQ_MODELS[number];
export const GROQ_DAILY_TOKEN_LIMIT = 200_000;
export const GROQ_MAX_COMPLETION_TOKENS = 2_048;

export type TokenUsage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

export type AiGeneration = {
  provider: "groq" | "gemini";
  model: string;
  text: string;
  usage: TokenUsage | null;
};

export type AiProvidersConfig = {
  groq: { apiKey: string; models: GroqModel[]; dailyTokenLimit: number } | null;
  gemini: { apiKey: string; model: string } | null;
};
