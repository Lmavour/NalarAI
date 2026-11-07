import "server-only";
import { DEFAULT_GEMINI_MODEL } from "@/lib/gemini";

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
