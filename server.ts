import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import Cerebras from '@cerebras/cerebras_cloud_sdk';
import type { ChatCompletionCreateParams } from '@cerebras/cerebras_cloud_sdk/resources/chat/completions';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

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

// ─── Model Alternation ────────────────────────────────────────────────
// Alternate between two models to distribute load and avoid rate limits.
const MODELS = ['llama3.1-8b', 'gpt-oss-120b'];
let modelIndex = 0;

function getNextModel(): string {
  const model = MODELS[modelIndex % MODELS.length];
  modelIndex++;
  return model;
}

// ─── Security Middleware ───────────────────────────────────────────────

// 1. CORS — restrict API access to whitelisted origins only
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || [
  'http://localhost:3000',
  'https://nalar-ai-tau.vercel.app',
  'https://nalar-ai.web.id',
];

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (server-to-server, curl) in dev only
    if (!origin && process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin || '')) {
      return callback(null, true);
    }
    return callback(new Error('CORS: Origin not allowed'), false);
  },
  methods: ['POST'],
  allowedHeaders: ['Content-Type'],
  credentials: true,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

// 2. Helmet — set security-related HTTP headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: process.env.NODE_ENV === 'production'
        ? ["'self'"]
        : ["'self'", "'unsafe-inline'"],  // Vite HMR needs unsafe-inline in dev
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https://nalar-ai-tau.vercel.app", "https://nalar-ai.web.id"],
      connectSrc: ["'self'", "https://nalar-ai-tau.vercel.app", "https://nalar-ai.web.id"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      mediaSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  referrerPolicy: { policy: 'no-referrer' },
  hsts: process.env.NODE_ENV === 'production'
    ? { maxAge: 31536000, includeSubDomains: true, preload: true }
    : false,  // Don't set HSTS in development
}));

// 3. Rate Limiting — prevent abuse on /api/chat
const chatLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '60000', 10),  // 1 minute default
  max: parseInt(process.env.RATE_LIMIT_MAX || '20', 10),              // 20 requests per window default
  message: {
    error: 'Terlalu banyak request. Tunggu sebentar ya!',
    retryAfter: 60,
  },
  standardHeaders: true,   // Return rate limit info in RateLimit-* headers
  legacyHeaders: false,    // Disable X-RateLimit-* headers
  keyGenerator: (req: express.Request) => req.ip || 'unknown',
});

app.use('/api/chat', chatLimiter);

// General rate limit for static assets
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(generalLimiter);

// ─── Body Parsing ──────────────────────────────────────────────────────

app.use(express.json({ limit: '100kb' }));  // Limit request body size

// ─── Input Validation Middleware ────────────────────────────────────────

const validateChatRequest = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const { messages } = req.body;

  // Must have messages array
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Format request tidak valid — messages harus array' });
  }

  // Max 10 messages per request (prevent context overflow)
  if (messages.length > 10) {
    return res.status(400).json({ error: 'Maksimal 10 pesan per request' });
  }

  // Validate each message
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

  next();
};

// ─── System Instruction for the Active Learning AI ─────────────────────

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

// ─── API Proxy Endpoint ────────────────────────────────────────────────

app.post('/api/chat', validateChatRequest, async (req, res) => {
  const { messages } = req.body;

  try {
    // Build the messages array for Cerebras SDK using proper typed message objects
    const apiMessages: ChatCompletionCreateParams['messages'] = [
      { role: 'system', content: ACTIVE_LEARNING_PROMPT },
    ];

    // Add conversation history (last 5 messages for context)
    const recentMessages = messages.length > 5 ? messages.slice(-5) : messages;
    for (const msg of recentMessages) {
      if (msg.role === 'user') {
        apiMessages.push({ role: 'user', content: msg.content });
      } else {
        apiMessages.push({ role: 'assistant', content: msg.content });
      }
    }

    // Select model using round-robin alternation
    const model = getNextModel();

    // Add a 4-second delay before calling the API to avoid too-fast responses
    await new Promise(resolve => setTimeout(resolve, 4000));

    const chatCompletion = await getClient().chat.completions.create({
      messages: apiMessages,
      model: model,
      stream: false,
      max_completion_tokens: 32768,
      temperature: 0.7,
      top_p: 1,
    });

    // Extract the response content
    const content = chatCompletion.choices[0]?.message?.content;

    if (!content) {
      throw new Error('Empty response from Cerebras API');
    }

    res.json({ content });
  } catch (error: any) {
    // Note: Do NOT log the error object directly — it may contain sensitive info
    console.error(`Cerebras API Error (${error.name || 'unknown'}): ${error.message}`);

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
    res.status(statusCode).json({
      error: clientError,
      ...(process.env.NODE_ENV !== 'production' && { details: error.message }),
    });
  }
});

// ─── Health Check Endpoint ─────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Static File Serving & Multi-Page Routing ──────────────────────────

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'mpa',  // Multi-page app — Vite handles HTML routing automatically
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Landing page (root)
    app.get('/', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    // Chat page
    app.get('/chat', (req, res) => {
      res.sendFile(path.join(distPath, 'chat.html'));
    });
    // SPA fallback for other routes → landing page
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 NalarAI server running on http://localhost:${PORT}`);
    console.log(`🔒 CORS origins: ${allowedOrigins.join(', ')}`);
    console.log(`🛡️  Rate limit: ${process.env.RATE_LIMIT_MAX || '20'} req/min per IP`);
    console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔄 Models: ${MODELS.join(', ')} (round-robin)`);
  });
}

startServer();
