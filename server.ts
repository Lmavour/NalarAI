import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// ─── Security Middleware ───────────────────────────────────────────────

// 1. CORS — restrict API access to whitelisted origins only
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || ['http://localhost:3000'];

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
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'", "https://api.siputzx.my.id"],
      fontSrc: ["'self'"],
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
    const lastMessage = messages[messages.length - 1].content;
    
    // Constructing history context from recent messages
    let contextualPrompt = lastMessage;
    if (messages.length > 1) {
      const history = messages.slice(-5, -1) // last 4 messages for context
        .map((m: any) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
        .join('\n');
      contextualPrompt = `Berikut adalah percakapan sebelumnya:\n${history}\n\nUser: ${lastMessage}`;
    }

    const apiUrl = process.env.AI_API_URL || 'https://api.siputzx.my.id/api/ai/glm47flash';
    const url = new URL(apiUrl);
    url.searchParams.append('prompt', contextualPrompt);
    url.searchParams.append('system', ACTIVE_LEARNING_PROMPT);
    url.searchParams.append('temperature', '0.7');

    // If API key is configured, add it to headers
    const headers: Record<string, string> = {};
    if (process.env.AI_API_KEY) {
      headers['Authorization'] = `Bearer ${process.env.AI_API_KEY}`;
    }

    const response = await fetch(url.toString(), { headers });
    
    if (!response.ok) {
      throw new Error(`API returned status ${response.status}`);
    }

    const result = await response.json();
    
    if (result.status && result.data && result.data.response) {
      res.json({ content: result.data.response });
    } else {
      throw new Error('Invalid API response format');
    }
  } catch (error: any) {
    console.error('AI API Error:', error);
    // Don't expose internal error details to client in production
    res.status(500).json({ 
      error: 'Gagal mendapatkan jawaban dari AI',
      ...(process.env.NODE_ENV !== 'production' && { details: error.message }),
    });
  }
});

// ─── Health Check Endpoint ─────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Static File Serving & SPA ─────────────────────────────────────────

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 NalarAI server running on http://localhost:${PORT}`);
    console.log(`🔒 CORS origins: ${allowedOrigins.join(', ')}`);
    console.log(`🛡️  Rate limit: ${process.env.RATE_LIMIT_MAX || '20'} req/min per IP`);
    console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

startServer();
