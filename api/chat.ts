import type { VercelRequest, VercelResponse } from '@vercel/node';
import Cerebras from '@cerebras/cerebras_cloud_sdk';
import type { ChatCompletionCreateParams } from '@cerebras/cerebras_cloud_sdk/resources/chat/completions';

const ACTIVE_LEARNING_PROMPT = `
You are "Nalar.ai", a specialized pedagogical AI assistant designed to foster active learning.
Your goal is NEVER to provide immediate full answers. Instead, you guide the student through discovery and critical thinking.

GUIDANCE RULES:
1. Always start by acknowledging the user's level.
2. Use lead-in questions: Guide them step-by-step instead of dumping facts.
3. Use analogies: Explain abstract concepts using relatable metaphors.
4. Error handling: If they are wrong, don't just say "no", but ask "Why do you think that? What about [alternative]?"
5. TOPIC COHERENCE: Stay on the SAME topic the user is discussing. NEVER suddenly switch to a different subject (e.g., if user asks about biology, stay on biology — do NOT jump to math, physics, or other unrelated topics). Only change topic when the user explicitly asks about something new.

STRICT UNIVERSAL RULES:
1. SCANNABLE RESPONSE: Use markdown, bolding, and bullet points.
2. MATH: Use LaTeX ($inline$ and $$block$$).
3. Language: Indonesian (Slang educational/professional mixed is OK).

4. INTERACTIVE BLOCKS (MANDATORY):
   You MUST end every single message with exactly ONE interactive block.
   CRITICAL: You MUST use double brackets [[TYPE:{...}]] and ensure you include ALL required JSON fields.
   DO NOT truncate the JSON.
   IMPORTANT: Only use QUIZ, GAP_FILL, or PARAPHRASE. NEVER use other formats like FLOWCHART, MATCHING, TRUE_FALSE, etc.

   FORMATS (Double brackets are REQUIRED):
   
   A. MULTIPLE CHOICE QUIZ:
   [[QUIZ:{"question":"Teks Pertanyaan?","options":["A","B","C"],"correct":0,"explanation":"Penjelasan singkat"}]]
   
   B. GAP FILL:
   [[GAP_FILL:{"sentence":"Kata ___ adalah...","answer":"kunci","hint":"Bocoran"}]]
   
   C. PARAPHRASE:
   [[PARAPHRASE:{"context":"Jelaskan ulang konsep X"}]]

TONE: Intellectually stimulating, sharp, but very supportive.
`;

// ─── Cerebras Client (Lazy Singleton) ─────────────────────────────────
// Lazy initialization to avoid crashing on module load when CEREBRAS_API_KEY
// is not set (e.g., during Vercel cold start before env vars are injected).
let _client: InstanceType<typeof Cerebras> | null = null;

function getClient(): InstanceType<typeof Cerebras> {
  if (!_client) {
    const apiKey = process.env.CEREBRAS_API_KEY;
    if (!apiKey) {
      throw new Error('CEREBRAS_API_KEY environment variable is missing. Set it in Vercel dashboard or .env file.');
    }
    _client = new Cerebras({ apiKey });
  }
  return _client;
}

// ─── Model Configuration ────────────────────────────────────────────────
// Use gpt-oss-120b as the sole model for higher quality responses.
const MODEL = 'gpt-oss-120b';

// ─── Quota-Aware Dual-Layer Rate Limiter ──────────────────────────────────
// Cerebras gpt-oss-120b quota: 5 req/min, 150 req/hour, 2,400 req/day
// Tokens: 30K/min, 1M/hour, 1M/day
// Strategy: Dual-layer (global quota + per-IP fairness) to support ~10 concurrent users
// NOTE: In-memory only — does NOT persist across Vercel cold starts or multiple instances.
// For production-grade distributed rate limiting, consider Upstash Redis.

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// Global rate limits (with safety buffer for Cerebras quota)
const GLOBAL_LIMITS = {
  minute: { windowMs: 60_000, max: 4 },      // 4/min (quota: 5, 1 buffer)
  hour:   { windowMs: 3_600_000, max: 140 },  // 140/hr (quota: 150, 10 buffer)
  day:    { windowMs: 86_400_000, max: 2_300 },// 2,300/day (quota: 2,400, 100 buffer)
};

// Per-IP rate limits (fair distribution among ~10 users)
const IP_LIMITS = {
  minute: { windowMs: 60_000, max: 3 },       // 3/min per user
  hour:   { windowMs: 3_600_000, max: 15 },   // 15/hr per user
  day:    { windowMs: 86_400_000, max: 230 }, // 230/day per user
};

const globalRateMaps = {
  minute: new Map<string, RateLimitEntry>(),
  hour:   new Map<string, RateLimitEntry>(),
  day:    new Map<string, RateLimitEntry>(),
};

const ipRateMaps = {
  minute: new Map<string, RateLimitEntry>(),
  hour:   new Map<string, RateLimitEntry>(),
  day:    new Map<string, RateLimitEntry>(),
};

function checkWindow(
  map: Map<string, RateLimitEntry>,
  key: string,
  windowMs: number,
  max: number
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const entry = map.get(key);

  // Clean up expired entries periodically (prevent memory leak)
  if (map.size > 500) {
    for (const [k, val] of map) {
      if (val.resetTime <= now) map.delete(k);
    }
  }

  if (!entry || entry.resetTime <= now) {
    const newEntry: RateLimitEntry = { count: 1, resetTime: now + windowMs };
    map.set(key, newEntry);
    return { allowed: true, remaining: max - 1, resetTime: newEntry.resetTime };
  }

  if (entry.count >= max) {
    return { allowed: false, remaining: 0, resetTime: entry.resetTime };
  }

  entry.count++;
  return { allowed: true, remaining: max - entry.count, resetTime: entry.resetTime };
}

function checkDualRateLimit(ip: string): {
  allowed: boolean;
  reason?: string;
  retryAfterMs: number;
  globalRemaining: { minute: number; hour: number; day: number };
  ipRemaining: { minute: number; hour: number; day: number };
} {
  // Check global limits first (most constraining for multi-user)
  const gMin = checkWindow(globalRateMaps.minute, 'global', GLOBAL_LIMITS.minute.windowMs, GLOBAL_LIMITS.minute.max);
  const gHr  = checkWindow(globalRateMaps.hour,   'global', GLOBAL_LIMITS.hour.windowMs,   GLOBAL_LIMITS.hour.max);
  const gDay = checkWindow(globalRateMaps.day,    'global', GLOBAL_LIMITS.day.windowMs,    GLOBAL_LIMITS.day.max);

  if (!gMin.allowed) return { allowed: false, reason: 'quota_minute', retryAfterMs: gMin.resetTime - Date.now(), globalRemaining: { minute: 0, hour: gHr.remaining, day: gDay.remaining }, ipRemaining: { minute: 0, hour: 0, day: 0 } };
  if (!gHr.allowed)  return { allowed: false, reason: 'quota_hour',   retryAfterMs: gHr.resetTime - Date.now(),  globalRemaining: { minute: gMin.remaining, hour: 0, day: gDay.remaining }, ipRemaining: { minute: 0, hour: 0, day: 0 } };
  if (!gDay.allowed) return { allowed: false, reason: 'quota_day',    retryAfterMs: gDay.resetTime - Date.now(), globalRemaining: { minute: gMin.remaining, hour: gHr.remaining, day: 0 }, ipRemaining: { minute: 0, hour: 0, day: 0 } };

  // Check per-IP limits (fair distribution)
  const iMin = checkWindow(ipRateMaps.minute, ip, IP_LIMITS.minute.windowMs, IP_LIMITS.minute.max);
  const iHr  = checkWindow(ipRateMaps.hour,   ip, IP_LIMITS.hour.windowMs,   IP_LIMITS.hour.max);
  const iDay = checkWindow(ipRateMaps.day,    ip, IP_LIMITS.day.windowMs,    IP_LIMITS.day.max);

  if (!iMin.allowed) return { allowed: false, reason: 'user_minute', retryAfterMs: iMin.resetTime - Date.now(), globalRemaining: { minute: gMin.remaining, hour: gHr.remaining, day: gDay.remaining }, ipRemaining: { minute: 0, hour: iHr.remaining, day: iDay.remaining } };
  if (!iHr.allowed)  return { allowed: false, reason: 'user_hour',   retryAfterMs: iHr.resetTime - Date.now(),  globalRemaining: { minute: gMin.remaining, hour: gHr.remaining, day: gDay.remaining }, ipRemaining: { minute: iMin.remaining, hour: 0, day: iDay.remaining } };
  if (!iDay.allowed) return { allowed: false, reason: 'user_day',    retryAfterMs: iDay.resetTime - Date.now(), globalRemaining: { minute: gMin.remaining, hour: gHr.remaining, day: gDay.remaining }, ipRemaining: { minute: iMin.remaining, hour: iHr.remaining, day: 0 } };

  return {
    allowed: true,
    retryAfterMs: 0,
    globalRemaining: { minute: gMin.remaining, hour: gHr.remaining, day: gDay.remaining },
    ipRemaining: { minute: iMin.remaining, hour: iHr.remaining, day: iDay.remaining },
  };
}

// ─── CORS Configuration ──────────────────────────────────────────────
// Read allowed origins from env var (same pattern as server.ts)
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || [
  'https://nalar-ai-tau.vercel.app',
  'https://nalar-ai.web.id',
];

function getAllowedOrigin(reqOrigin: string | undefined): string | null {
  if (!reqOrigin) return ALLOWED_ORIGINS[0]; // Default to first allowed origin
  if (ALLOWED_ORIGINS.includes(reqOrigin)) return reqOrigin;
  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const reqOrigin = req.headers.origin as string | undefined;
  const allowedOrigin = getAllowedOrigin(reqOrigin);

  // CORS headers — MUST be set before any method checks or early returns
  if (allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');

  // Handle preflight — MUST be checked BEFORE the POST-only guard
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // Only allow POST requests (OPTIONS already handled above)
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ─── Dual-Layer Rate Limiting (Global Quota + Per-IP Fairness) ────────
  const clientIp = req.headers['x-forwarded-for'] as string || req.headers['x-real-ip'] as string || 'unknown';
  const ip = clientIp.split(',')[0].trim();
  const rateResult = checkDualRateLimit(ip);

  // Set rate limit headers for client awareness
  res.setHeader('X-RateLimit-Global-Minute', rateResult.globalRemaining.minute.toString());
  res.setHeader('X-RateLimit-Global-Hour', rateResult.globalRemaining.hour.toString());
  res.setHeader('X-RateLimit-Global-Day', rateResult.globalRemaining.day.toString());
  res.setHeader('X-RateLimit-IP-Minute', rateResult.ipRemaining.minute.toString());
  res.setHeader('X-RateLimit-IP-Hour', rateResult.ipRemaining.hour.toString());
  res.setHeader('X-RateLimit-IP-Day', rateResult.ipRemaining.day.toString());

  if (!rateResult.allowed) {
    const retryAfterSec = Math.ceil(rateResult.retryAfterMs / 1000);
    res.setHeader('Retry-After', retryAfterSec.toString());
    const reasonMessages: Record<string, string> = {
      quota_minute: 'Kuota server habis untuk menit ini. Tunggu sebentar ya!',
      quota_hour:   'Kuota server habis untuk jam ini. Coba lagi nanti!',
      quota_day:    'Kuota server habis untuk hari ini. Coba lagi besok!',
      user_minute:  'Kamu terlalu banyak bertanya. Tunggu sebentar ya!',
      user_hour:    'Kamu sudah banyak bertanya jam ini. Coba lagi nanti!',
      user_day:     'Kamu sudah mencapai batas harian. Coba lagi besok!',
    };
    return res.status(429).json({
      error: reasonMessages[rateResult.reason || 'quota_minute'] || 'Terlalu banyak request. Tunggu sebentar ya!',
      retryAfter: retryAfterSec,
      reason: rateResult.reason,
    });
  }

  // ─── Input Validation ───────────────────────────────────────────────
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Format request tidak valid — messages harus array' });
  }

  if (messages.length > 6) {
    return res.status(400).json({ error: 'Maksimal 6 pesan per request (kuota terbatas)' });
  }

  for (const msg of messages) {
    if (!msg || typeof msg !== 'object') {
      return res.status(400).json({ error: 'Format pesan tidak valid' });
    }
    if (!msg.role || !msg.content) {
      return res.status(400).json({ error: 'Setiap pesan harus memiliki role dan content' });
    }
    if (msg.role !== 'user' && msg.role !== 'assistant') {
      return res.status(400).json({ error: 'Role harus "user" atau "assistant"' });
    }
    if (typeof msg.content !== 'string') {
      return res.status(400).json({ error: 'Content harus berupa string' });
    }
    if (msg.content.length > 2000) {
      return res.status(400).json({ error: 'Content maksimal 2000 karakter' });
    }
    if (msg.content.trim().length === 0) {
      return res.status(400).json({ error: 'Content tidak boleh kosong' });
    }
  }

  // Check body size (defense-in-depth; Vercel has a 4.5MB default limit)
  const bodySize = JSON.stringify(req.body).length;
  if (bodySize > 100_000) {
    return res.status(413).json({ error: 'Request body terlalu besar (max 100KB)' });
  }

  // ─── Cerebras AI API Call ────────────────────────────────────────────
  try {
    // Build the messages array for Cerebras SDK using proper typed message objects
    const apiMessages: ChatCompletionCreateParams['messages'] = [
      { role: 'system', content: ACTIVE_LEARNING_PROMPT },
    ];

    // Add conversation history (last 3 messages for context — token conservation)
    const recentMessages = messages.length > 3 ? messages.slice(-3) : messages;
    for (const msg of recentMessages) {
      if (msg.role === 'user') {
        apiMessages.push({ role: 'user', content: msg.content });
      } else {
        apiMessages.push({ role: 'assistant', content: msg.content });
      }
    }

    const chatCompletion = await getClient().chat.completions.create({
      messages: apiMessages,
      model: MODEL,
      stream: false,
      max_completion_tokens: 2048,
      temperature: 0.7,
      top_p: 1,
    }) as any;

    // Extract the response content
    const content = (chatCompletion as any).choices[0]?.message?.content;

    if (!content) {
      throw new Error('Empty response from Cerebras API');
    }

    return res.status(200).json({ content });
  } catch (error: any) {
    // Determine appropriate status code
    let statusCode = 500;
    let clientError = 'Gagal mendapatkan jawaban dari AI';

    if (error.status === 429) {
      statusCode = 429;
      clientError = 'Rate limit Cerebras tercapai. Coba lagi nanti.';
    } else if (error.status === 401) {
      statusCode = 500;
      clientError = 'Konfigurasi API key tidak valid.';
    }

    // Don't expose internal error details to client in production
    console.error(`Cerebras API Error (${error.name || 'unknown'}): ${error.message}`);
    return res.status(statusCode).json({
      error: clientError,
      ...(process.env.NODE_ENV !== 'production' && { details: error.message }),
    });
  }
}