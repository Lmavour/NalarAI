import type { VercelRequest, VercelResponse } from '@vercel/node';

const ACTIVE_LEARNING_PROMPT = `
You are "Nalar.ai", a specialized pedagogical AI assistant designed to foster active learning.
Your goal is NEVER to provide immediate full answers. Instead, you guide the student through discovery and critical thinking.

GUIDANCE RULES:
1. Always start by acknowledging the user's level.
2. Use lead-in questions: Guide them step-by-step instead of dumping facts.
3. Use analogies: Explain abstract concepts using relatable metaphors.
4. Error handling: If they are wrong, don't just say "no", but ask "Why do you think that? What about [alternative]?"

STRICT UNIVERSAL RULES:
1. SCANNABLE RESPONSE: Use markdown, bolding, and bullet points.
2. MATH: Use LaTeX ($inline$ and $$block$$).
3. Language: Indonesian (Slang educational/professional mixed is OK).

4. INTERACTIVE BLOCKS (MANDATORY):
   You MUST end every single message with exactly ONE interactive block. 
   CRITICAL: You MUST use double brackets [[TYPE:{...}]] and ensure you include ALL required JSON fields.
   DO NOT truncate the JSON.

   FORMATS (Double brackets are REQUIRED):
   
   A. MULTIPLE CHOICE QUIZ:
   [[QUIZ:{"question":"Teks Pertanyaan?","options":["A","B","C"],"correct":0,"explanation":"Penjelasan singkat"}]]
   
   B. GAP FILL:
   [[GAP_FILL:{"sentence":"Kata ___ adalah...","answer":"kunci","hint":"Bocoran"}]]
   
   C. PARAPHRASE:
   [[PARAPHRASE:{"context":"Jelaskan ulang konsep X"}]]

TONE: Intellectually stimulating, sharp, but very supportive.
`;

// ─── In-Memory Rate Limiter ──────────────────────────────────────────────
// NOTE: This is a simple in-memory rate limiter for Vercel serverless functions.
// It works within a single warm instance but does NOT persist across cold starts
// or multiple instances. For production-grade distributed rate limiting, consider:
//   - Vercel Edge Config (Pro plan): https://vercel.com/docs/rate-limiting
//   - Upstash Redis: https://upstash.com/docs/redis/features/ratelimiting
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW || '60000', 10);
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX || '20', 10);

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  // Clean up expired entries periodically (prevent memory leak)
  if (rateLimitMap.size > 1000) {
    rateLimitMap.forEach((val, key) => {
      if (val.resetTime <= now) {
        rateLimitMap.delete(key);
      }
    });
  }

  if (!entry || entry.resetTime <= now) {
    // New window or expired window
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW_MS,
    };
    rateLimitMap.set(ip, newEntry);
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1, resetTime: newEntry.resetTime };
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    // Limit exceeded
    return { allowed: false, remaining: 0, resetTime: entry.resetTime };
  }

  // Increment count within current window
  entry.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX - entry.count, resetTime: entry.resetTime };
}

// ─── CORS Configuration ──────────────────────────────────────────────────
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
  // (Original code had this AFTER the POST check, making it unreachable/dead code)
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // Only allow POST requests (OPTIONS already handled above)
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ─── Rate Limiting ────────────────────────────────────────────────────
  const clientIp = req.headers['x-forwarded-for'] as string || req.headers['x-real-ip'] as string || 'unknown';
  // x-forwarded-for may contain multiple IPs; use the first (client) one
  const ip = clientIp.split(',')[0].trim();
  const rateResult = checkRateLimit(ip);

  // Set rate limit headers for client awareness
  res.setHeader('X-RateLimit-Limit', RATE_LIMIT_MAX.toString());
  res.setHeader('X-RateLimit-Remaining', rateResult.remaining.toString());
  res.setHeader('X-RateLimit-Reset', rateResult.resetTime.toString());

  if (!rateResult.allowed) {
    res.setHeader('Retry-After', Math.ceil((rateResult.resetTime - Date.now()) / 1000).toString());
    return res.status(429).json({
      error: 'Terlalu banyak request. Tunggu sebentar ya!',
      retryAfter: Math.ceil((rateResult.resetTime - Date.now()) / 1000),
    });
  }

  // ─── Input Validation ─────────────────────────────────────────────────
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Format request tidak valid — messages harus array' });
  }

  if (messages.length > 10) {
    return res.status(400).json({ error: 'Maksimal 10 pesan per request' });
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

  // ─── AI API Proxy ─────────────────────────────────────────────────────
  try {
    const lastMessage = messages[messages.length - 1].content;

    let contextualPrompt = lastMessage;
    if (messages.length > 1) {
      const history = messages.slice(-5, -1)
        .map((m: any) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
        .join('\n');
      contextualPrompt = `Berikut adalah percakapan sebelumnya:\n${history}\n\nUser: ${lastMessage}`;
    }

    const apiUrl = process.env.AI_API_URL || 'https://api.siputzx.my.id/api/ai/gptoss120b';
    const url = new URL(apiUrl);
    url.searchParams.append('prompt', contextualPrompt);
    url.searchParams.append('system', ACTIVE_LEARNING_PROMPT);
    url.searchParams.append('temperature', '0.7');

    const headers: Record<string, string> = {};
    if (process.env.AI_API_KEY) {
      headers['Authorization'] = `Bearer ${process.env.AI_API_KEY}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout
    const response = await fetch(url.toString(), { headers, signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`API returned status ${response.status}`);
    }

    const result = await response.json();

    if (result.status && result.data && result.data.response) {
      return res.status(200).json({ content: result.data.response });
    } else {
      throw new Error('Invalid API response format');
    }
  } catch (error: any) {
    // Determine appropriate status code
    let statusCode = 500;
    let clientError = 'Gagal mendapatkan jawaban dari AI';

    if (error.name === 'AbortError') {
      statusCode = 504;
      clientError = 'Server AI tidak merespons. Coba lagi nanti.';
    }

    // Don't expose internal error details to client in production
    // Note: Do NOT log the error object directly — it may contain the API URL
    console.error(`AI API Error (${error.name || 'unknown'}): ${error.message}`);
    return res.status(statusCode).json({
      error: clientError,
      ...(process.env.NODE_ENV !== 'production' && { details: error.message }),
    });
  }
}