# 🔒 NalarAI — Security & Server-Side Architecture

## Overview

NalarAI uses a **server-side proxy architecture** to protect AI API credentials and enforce security policies. The frontend never directly calls any external AI API — all requests are routed through the Express backend at `/api/chat`.

---

## Current Security Architecture

```
┌─────────────┐       ┌──────────────────────┐       ┌─────────────────┐
│  Client SPA  │──────▶│  Express Server Proxy │──────▶│  External AI API │
│  (React/Vite)│  POST │  /api/chat            │  GET  │  (GLM-4 Flash)   │
└─────────────┘       └──────────────────────┘       └─────────────────┘
                            │
                     ┌──────┴──────┐
                     │  Security   │
                     │  Middleware  │
                     │  ─────────  │
                     │  • CORS     │
                     │  • Helmet   │
                     │  • Rate Lim │
                     │  • Validate │
                     └─────────────┘
```

### Why Server-Side Proxy?

| Risk | If Client Calls API Directly | With Server Proxy |
|------|------------------------------|-------------------|
| **API Key Exposure** | Key embedded in frontend JS — visible in DevTools | Key stored server-side only — never reaches client |
| **CORS Bypass** | Browser enforces CORS — may need to disable it | Server-to-server calls have no CORS restriction |
| **Rate Limiting** | Cannot enforce per-user limits from client | Server tracks requests per IP/session |
| **Input Validation** | Client-side only — easily bypassed | Server validates before forwarding |
| **API Abuse** | Anyone with the key can call the API unlimited | Server controls who gets access and how much |

---

## Security Layers

### 1. CORS (Cross-Origin Resource Sharing)

**Configuration:** [`server.ts`](server.ts) — `cors` middleware

```typescript
import cors from 'cors';

const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  methods: ['POST'],
  allowedHeaders: ['Content-Type'],
  credentials: true,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
```

**Rules:**
- Only whitelisted origins in `ALLOWED_ORIGINS` can call `/api/chat`
- Only `POST` method is permitted on the API endpoint
- `Content-Type` header is the only allowed custom header
- In production, set `ALLOWED_ORIGINS` to your deployed domain(s)

### 2. Helmet (HTTP Security Headers)

**Configuration:** [`server.ts`](server.ts) — `helmet` middleware

```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],  // Vite HMR needs unsafe-inline in dev
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'", "https://api.siputzx.my.id"],
    },
  },
  referrerPolicy: { policy: 'no-referrer' },
}));
```

**Headers enforced:**
- `Content-Security-Policy` — prevents XSS by restricting resource loading
- `X-Frame-Options` — prevents clickjacking (DENY)
- `X-Content-Type-Options` — prevents MIME sniffing (nosniff)
- `Strict-Transport-Security` — forces HTTPS in production
- `X-XSS-Protection` — enables browser XSS filter
- `Referrer-Policy` — no-referrer to protect user privacy

### 3. Rate Limiting

**Configuration:** [`server.ts`](server.ts) — `express-rate-limit` middleware

```typescript
import rateLimit from 'express-rate-limit';

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,           // 1 minute window
  max: 20,                        // 20 requests per window per IP
  message: {
    error: 'Terlalu banyak request. Tunggu sebentar ya!',
    retryAfter: 60,
  },
  standardHeaders: true,          // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false,           // Disable `X-RateLimit-*` headers
  keyGenerator: (req) => {
    return req.ip || 'unknown';
  },
});

app.use('/api/chat', chatLimiter);
```

**Limits:**
- **20 requests/minute per IP** on `/api/chat` — prevents spam and API cost abuse
- **100 requests/minute per IP** on static assets — prevents DoS on page loads
- Rate limit headers are returned so clients can self-throttle

### 4. Input Validation

**Configuration:** [`server.ts`](server.ts) — custom validation middleware

```typescript
const validateChatRequest = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const { messages } = req.body;

  // Must have messages array
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Format request tidak valid' });
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
    if (typeof msg.content !== 'string' || msg.content.length > 2000) {
      return res.status(400).json({ error: 'Content maksimal 2000 karakter' });
    }
  }

  next();
};

app.post('/api/chat', validateChatRequest, async (req, res) => { ... });
```

**Validations:**
- `messages` must be a non-empty array
- Max 10 messages per request (prevents context injection)
- Each message must have valid `role` (`user`/`assistant`) and `content` (string)
- Single message content capped at **2000 characters** (prevents prompt injection via oversized input)
- No executable code or script tags are forwarded

### 5. API Key Protection

**Strategy:** API keys are **never exposed to the client**

- The [`vite.config.ts`](vite.config.ts) previously injected `GEMINI_API_KEY` into frontend JS — this is **removed**
- All AI API calls go through [`server.ts`](server.ts) → `/api/chat`
- API URLs and keys are stored in `.env` (server-side only)
- `.env` is listed in `.gitignore` — never committed to repository

**Before (INSECURE):**
```typescript
// vite.config.ts — KEY EXPOSED IN CLIENT BUNDLE!
define: {
  'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
}
```

**After (SECURE):**
```typescript
// vite.config.ts — No API keys in client bundle
define: {
  // Removed: process.env.GEMINI_API_KEY
}
```

### 6. Environment Variables

**Configuration:** [`.env.example`](.env.example)

| Variable | Purpose | Example |
|----------|---------|---------|
| `AI_API_URL` | External AI API base URL | `https://api.siputzx.my.id/api/ai/glm47flash` |

| `ALLOWED_ORIGINS` | CORS whitelist (comma-separated) | `https://nalar.ai,https://app.nalar.ai` |
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Server port | `3000` |
| `RATE_LIMIT_WINDOW` | Rate limit time window (ms) | `12000` |
| `RATE_LIMIT_MAX` | Max requests per window | `250` |

> ⚠️ **NEVER commit `.env` to git.** Only `.env.example` (with placeholder values) is committed.

---

## Threat Model

### Mitigated Threats

| Threat | Mitigation | Layer |
|--------|-----------|-------|
| **API Key Leakage** | Keys never reach client bundle | Server Proxy |
| **XSS (Cross-Site Scripting)** | CSP headers, input validation | Helmet + Validation |
| **CSRF (Cross-Site Request Forgery)** | CORS origin whitelist, same-origin policy | CORS |
| **Rate Abuse / DoS** | Per-IP rate limiting | Rate Limiter |
| **Prompt Injection** | Input length cap, role validation | Validation |
| **Clickjacking** | X-Frame-Options: DENY | Helmet |
| **MIME Sniffing** | X-Content-Type-Options: nosniff | Helmet |
| **Data Exfiltration via Referrer** | Referrer-Policy: no-referrer | Helmet |

### Remaining Risks (Acceptable)

| Risk | Status | Notes |
|------|--------|-------|
| **No user authentication** | Accepted for MVP | No login system — rate limiting is per-IP only. Add auth for production. |
| **No HTTPS enforcement (dev)** | Dev only | In production, use reverse proxy (nginx/cloud) with TLS. |
| **Session persistence** | Not implemented | Messages stored in React state only — lost on refresh. No server-side session. |

---

## Production Deployment Checklist

- [ ] Set `NODE_ENV=production` in `.env`
- [ ] Set `ALLOWED_ORIGINS` to production domain(s) only
- [ ] Remove `http://localhost` from `ALLOWED_ORIGINS`
- [ ] Enable HTTPS via reverse proxy (nginx, Cloud Run, etc.)
- [ ] Set `Strict-Transport-Security` with long max-age
- [ ] Remove `'unsafe-inline'` from CSP `scriptSrc` (use nonce-based CSP)
- [ ] Add authentication layer (JWT, OAuth, etc.) for user tracking
- [ ] Monitor rate limit logs for abuse patterns
- [ ] Rotate API keys periodically
- [ ] Enable server-side logging for audit trail
- [ ] Set up health check endpoint (`/health`) for monitoring
- [ ] Review and tighten CSP `connectSrc` to only necessary domains

---

## Quick Start (Security-Enabled)

```bash
# 1. Install security dependencies
npm install cors helmet express-rate-limit
npm install -D @types/cors

# 2. Copy and configure environment
cp .env.example .env
# Edit .env with your production values

# 3. Run in development
npm run dev

# 4. Build and run in production
npm run build
npm run start
```

---

## File Reference

| File | Security Role |
|------|--------------|
| [`server.ts`](server.ts) | Main server — CORS, Helmet, Rate Limit, Validation, API Proxy |
| [`vite.config.ts`](vite.config.ts) | Client bundler — **no API keys** injected |
| [`.env.example`](.env.example) | Template for environment variables (safe to commit) |
| [`.env`](.env) | Actual secrets — **NEVER commit** (in `.gitignore`) |
| [`src/components/ChatInterface.tsx`](src/components/ChatInterface.tsx) | Frontend — calls `/api/chat` only, never external APIs directly |

---

*Last updated: 2026-05-16*