import "server-only";
import { DEFAULT_GEMINI_MODEL, GROQ_DAILY_TOKEN_LIMIT, GROQ_MODELS, type AiProvidersConfig, type GroqModel } from "@/lib/ai-config";

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

export function getMongoConfig() {
  return {
    uri: required("MONGODB_URI"),
    dbName: process.env.MONGODB_DB_NAME?.trim() || "nalarai",
  };
}

export function getSessionPepper() {
  const value = required("SESSION_PEPPER");
  if (value.length < 32 || value.includes("replace-with")) {
    throw new Error("SESSION_PEPPER must contain at least 32 random characters");
  }
  return value;
}

export function getGeminiConfig() {
  const apiKey = required("GEMINI_API_KEY");
  if (apiKey.length < 20) throw new Error("GEMINI_API_KEY is invalid");
  return { apiKey, model: process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL };
}

export function getAiProvidersConfig(): AiProvidersConfig {
  const groqKey = process.env.GROQ_API_KEY?.trim();
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  if (!groqKey && !geminiKey) throw new Error("At least one server-side AI API key must be configured");

  let groq: AiProvidersConfig["groq"] = null;
  if (groqKey) {
    if (!groqKey.startsWith("gsk_") || groqKey.length < 30 || groqKey.includes("replace-with")) throw new Error("GROQ_API_KEY is invalid");
    const models = process.env.GROQ_MODELS?.split(",").map((model) => model.trim()).filter(Boolean) ?? [...GROQ_MODELS];
    if (!models.length || models.some((model) => !GROQ_MODELS.includes(model as GroqModel))) throw new Error("GROQ_MODELS contains an unsupported model");
    const limit = Number(process.env.GROQ_DAILY_TOKEN_LIMIT ?? GROQ_DAILY_TOKEN_LIMIT);
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > GROQ_DAILY_TOKEN_LIMIT) throw new Error("GROQ_DAILY_TOKEN_LIMIT must be between 1 and 200000");
    groq = { apiKey: groqKey, models: [...new Set(models)] as GroqModel[], dailyTokenLimit: limit };
  }
  return { groq, gemini: geminiKey ? getGeminiConfig() : null };
}
