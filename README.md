# NalarAI

NalarAI is a mobile-first, gamified learning PWA built with Next.js App Router. It turns any topic into bite-sized Indonesian lessons and interactive quizzes using a rotating Groq model pool with Google Gemini fallback, then persists learning progress and model token budgets in MongoDB.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Public landing page with product story, feature previews, CTAs, and PWA install control |
| `/auth` | Email/password registration and login |
| `/app` | Authenticated learning path, document library, scheduled flashcards, league, and profile |
| `/api/auth/*` | Register, login, logout, and session endpoints |
| `/api/lesson-sessions` | Authenticated server-side lesson generation |
| `/api/lesson-sessions/[id]/answer` | One-attempt answer validation and rewards |
| `/api/progress` | Current learner progress and gamification state |
| `/api/documents` | Owned PDF/DOCX text upload and document metadata listing |
| `/api/documents/[id]/study` | Cached, source-grounded Gemini document lesson |
| `/api/documents/[id]/sources/[segmentId]` | Authenticated page/section text reference |
| `/api/documents/[id]` | Owned document and derived learning-data deletion |
| `/api/flashcards` | Owned due queue with recovery of pending quiz outcomes |
| `/api/flashcards/[id]/review` | Versioned, idempotent recall rating and next schedule |

## Stack

- Next.js 16 App Router and React 19
- TypeScript in strict mode
- Tailwind CSS 4 with a custom sapphire design system
- MongoDB with Mongoose
- bcrypt password hashing and opaque HTTP-only sessions
- Google Gemini through the official server-side `@google/genai` SDK
- Groq through `groq-sdk`, with streamed JSON and durable per-model daily budgets
- `pdf-parse`, Mammoth, and bounded ZIP inspection for private document text extraction
- Manual service worker and web app manifest
- Playwright using an existing local Chromium executable

AI credentials and provider routing stay on the server; no API key uses a `NEXT_PUBLIC_` variable.

## Project Structure

```text
NalarAI/
├── e2e/
│   └── public-app.spec.ts
├── public/
│   ├── manifest.json
│   ├── sw.js
│   ├── offline.html
│   └── icon-*.png
├── src/
│   ├── app/
│   │   ├── page.tsx
│   │   ├── auth/page.tsx
│   │   ├── app/page.tsx
│   │   └── api/
│   │       ├── auth/
│   │       ├── lesson-sessions/
│   │       └── progress/
│   ├── components/
│   │   ├── learning/
│   │   ├── auth-form.tsx
│   │   ├── install-app-button.tsx
│   │   └── pwa-register.tsx
│   ├── lib/
│   │   ├── ai.ts
│   │   ├── auth.ts
│   │   ├── db.ts
│   │   ├── email.ts
│   │   ├── rate-limit.ts
│   │   └── rewards.ts
│   ├── models/
│   │   ├── user.ts
│   │   ├── auth-session.ts
│   │   ├── user-progress.ts
│   │   ├── gamification.ts
│   │   ├── lesson-session.ts
│   │   └── rate-limit.ts
│   └── types/
├── next.config.ts
├── playwright.config.ts
└── .env.example
```

## Environment

Copy `.env.example` to `.env` and set:

```env
MONGODB_URI="mongodb://USERNAME:PASSWORD@HOST:PORT/"
MONGODB_DB_NAME="nalarai"
SESSION_PEPPER="at-least-32-random-characters"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
GEMINI_API_KEY="replace-with-a-server-side-gemini-api-key"
GEMINI_MODEL="gemini-3.5-flash-lite"
GROQ_API_KEY="replace-with-a-server-side-groq-api-key"
GROQ_MODELS="openai/gpt-oss-120b,openai/gpt-oss-20b,qwen/qwen3.8-27b"
GROQ_DAILY_TOKEN_LIMIT="200000"
PLAYWRIGHT_CHROMIUM_PATH="C:\\path\\to\\an-existing\\chrome.exe"
```

Generate the session pepper with:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Never commit `.env`. Use a TLS-enabled MongoDB URI in production. Set `NEXT_PUBLIC_APP_URL` to the browser-facing production origin before building; production mutation routes validate against that origin. Development validates the actual request host, so `localhost` and `127.0.0.1` work even when the server binds to `0.0.0.0`.

Configure at least one AI API key and leave unused provider keys empty. With both keys configured, Groq is primary and Gemini is the fallback. `GROQ_DAILY_TOKEN_LIMIT` may lower the internal daily allowance, but cannot exceed 200,000.

## Local Development

```powershell
$env:PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD='1'
npm.cmd install
npm.cmd run dev
```

Open `http://localhost:3000`.

## Verification

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
npm.cmd run test:ai
npm.cmd run test:providers
npm.cmd run test:documents
npm.cmd run test:e2e
```

Playwright reads `PLAYWRIGHT_CHROMIUM_PATH` and launches only that existing executable with `--no-sandbox` and `--disable-setuid-sandbox`. It does not install a browser.

## Database Availability

The connection cache holds only a ready Mongoose connection and one in-flight initialization promise. Disconnected connections and legacy resolved promises are discarded. Transient establishment failures are retried once, with a graceful pool close rather than force-closing Mongoose collections. Selection has a 20-second deadline, connection handshake 15 seconds, and socket inactivity 30 seconds. This is not a retry of session, reward, or quota writes.

If MongoDB is unavailable, `/app` renders a safe availability state instead of forwarding driver topology objects to React. Existing sessions and progress are not assumed valid without the database. A manual retry refreshes the page; there is no automatic retry loop and no authentication or local-quota bypass.

`npm run test:providers` includes isolated connection-cache tests. To run a read-only live connection, authentication, ping, and model-query check, set `LIVE_DATABASE_SMOKE=1` and run `node --conditions=react-server node_modules/@playwright/test/cli.js test --config playwright.ai.config.ts --grep "live database connector"`. A reachable TCP port alone does not prove that MongoDB handshakes will respond reliably.

## Data Model

| Collection | Responsibility |
| --- | --- |
| `users` | Normalized email, bcrypt hash, timestamps |
| `authsessions` | Hashed opaque session secrets and expiration |
| `userprogresses` | Active topic, completed path stages, activity dates |
| `gamifications` | XP, hearts, streaks, league, idempotent reward receipts |
| `lessonsessions` | Generated material, private answer key, private provider/usage metadata, attempts, result receipt |
| `aitokenbudgets` | Shared per-Groq-model UTC-day token reservations, measured usage, and retained settlement history |
| `studydocuments` | Owned extracted source segments, page/section labels, cached Gemini lesson, and generation lease |
| `flashcards` | Copied source-grounded QA, due schedule, revision, and retained per-card event receipts |
| `ratelimits` | Mongo-backed fixed-window abuse controls with TTL cleanup |

## AI Contract

Groq chooses the eligible model with the smallest accounted plus outstanding token load, using last reservation time as the tie breaker. Each logical generation tries a model at most once, then proceeds to another model or Gemini on failure. Model availability is checked against Groq's catalog and cached for five minutes; 403/404/429 temporarily remove a model from that cached pool.

| Groq Model | Internal Daily Ceiling | Completion Limit |
| --- | --- | --- |
| `openai/gpt-oss-120b` | 200,000 input + output tokens | 2,048 tokens |
| `openai/gpt-oss-20b` | 200,000 input + output tokens | 2,048 tokens |
| `qwen/qwen3.8-27b` | 200,000 input + output tokens | 2,048 tokens |

Groq uses temperature `1`, top-p `1`, medium reasoning, and internal server-side streaming. JSON mode is used because strict JSON-schema mode is incompatible with streaming. Only final answer text is assembled; reasoning is not forwarded to the browser. A complete, untruncated response and trustworthy `x_groq.usage` are required, then Zod validates the lesson. Groq SDK automatic retries are disabled, so one reservation authorizes one physical attempt.

The internal daily ceiling is shared across all users and instances, resets at 00:00 UTC (07:00 WIB), and does not change Groq's official RPM/TPM/TPD limits. Calls made outside NalarAI with the same API key are not visible to its ledger. Provider-side 429 responses can therefore occur before the internal limit is reached.

Before dispatch, the server reserves a conservative text-only input bound (UTF-8 bytes plus 1,024 framing tokens) plus the 2,048-token completion cap. MongoDB atomically requires `accountedTokens + reservedTokens + reservation <= limit`. Known input/output usage replaces that hold exactly once, including reasoning already counted in completion tokens. Unknown or crashed outcomes remain held or charged at the reservation amount, not zero. Paid malformed responses still consume quota. A usage overrun is recorded and quarantines the model rather than clamping or concealing it.

The unsharded quota collection uses majority/journaled writes, a unique partial reservation-ID index, retained terminal IDs, and a 30-day history TTL created explicitly even in production. TTL is cleanup, not the reset mechanism. The ledger is bounded to 4,096 reservations/day/model. All deployments must share this collection and maintain synchronized UTC clocks. If quota storage cannot safely acknowledge admission, Groq is not called.

Gemini remains available through `@google/genai` using `gemini-3.5-flash-lite`, temperature `0.7`, minimal thinking, structured `application/json`, and an 8,192-output-token limit. Its API key remains server-only. Successful provider/model/usage metadata is stored privately alongside the generated session; the browser receives neither keys nor answer keys.

`npm run test:ai` exercises Groq/Gemini adapters and the lesson parser without starting Next.js or a browser. `npm run test:providers` runs environment-free quota/concurrency/fallback tests against an atomic collection fake; it does not touch MongoDB or call providers.

For live Gemini verification, set `LIVE_AI_SMOKE=1` and filter `test:ai` with `--grep "live Gemini"`. Live Groq verification requires `LIVE_GROQ_SMOKE=1` and Node's `--conditions=react-server`; run `node --conditions=react-server node_modules/@playwright/test/cli.js test --config playwright.ai.config.ts --grep "live Groq"`. These Groq checks make paid calls and record their real reservations and usage in the configured MongoDB. `LIVE_PROVIDER_FALLBACK=1` with `--grep "live Gemini fallback"` verifies a real Gemini fallback without changing persisted daily limits. Normal test runs skip all live checks.

Correct answers and explanations remain server-side until the learner commits one answer. Duplicate submissions are idempotent, and the same generated session cannot award XP twice.

## Document Learning and Scheduled Recall

Use the **Materi** tab to choose an extraction mode before upload, then select **Pelajari dokumen**. Each upload is limited to 4 MiB, 120,000 recognized/extracted characters, and 512 source segments of at most 1,800 characters. Password-protected PDFs and DOC/DOCM are not supported. The library permits up to 20 active documents.

| Mode | Input | Processing and Limits |
| --- | --- | --- |
| **Ekstrak Teks** | PDF/DOCX | Local extraction without AI; PDF up to 40 pages. Images require OCR. |
| **OCR Penuh** | PDF/DOCX/PNG/JPG | Original file sent inline to Gemini; PDF up to 10 pages, images up to 20 megapixels. DOCX uses logical sections, not visual page numbers. |

OCR is an explicit choice, never a silent fallback from local text extraction. Gemini transcribes into a strict complete-unit schema; missing/duplicate/out-of-range pages, unreadable units, truncated SDK responses, and DOCX output omitting baseline text are rejected. OCR uses temperature 0 and up to 32,768 output tokens; normal lesson generation remains limited to 8,192. Each user can attempt OCR at most three times/hour, separately from the general upload limit. If OCR is unavailable, the selected file is retained and the user may explicitly select **Beralih ke Ekstrak Teks** for PDF/DOCX; this changes the mode but does not upload automatically. Scanned images still require the OCR service.

Only extracted or OCR-recognized text is persisted privately; the original binary is discarded, never copied into `public`. OCR sends it through SDK inline data, not a persistent Gemini Files API upload. Provider processing/retention terms still apply. PDF extraction disables eval, XFA, and external worker fetching. DOCX preflight bounds entry counts, expanded ZIP bytes, compression ratios, and rejects encrypted/macro/unsafe archives before any AI request. Image format and dimensions are checked before OCR. Upload requests are byte-bounded even without Content-Length.

The stored extraction mode is part of document uniqueness. Legacy documents are backfilled as text without changing their sources/templates, and the old owner/file-hash index is replaced only after the new owner/hash/mode constraint exists. The same file can therefore have separate text/OCR document IDs, preserving earlier citation and review history. Its first completion reward still uses the unchanged file hash, so switching modes cannot farm XP.

Document study uses Gemini directly with an untrusted-source instruction and a source-aware JSON schema. AI emits only source IDs from the selected document; page/section labels and text are resolved by the server. All concepts must have recall coverage and all quiz/card material indexes are validated against the actual material count. A generation lease prevents parallel cache creation. A cached document lesson can be reused without another AI generation or resetting established card schedules. Citations let users inspect the real retained source text, but structural validation is not proof that every AI educational claim is correct.

The **Ulang** tab presents due cards, hides the answer until deliberately revealed, then accepts Ulangi/Sulit/Baik/Mudah recall ratings. Scheduling is server-owned and SM-2-inspired: again is ten minutes, initial hard is six hours, good advances through one/three days then an ease multiplier, easy begins at four days; intervals cap at 365 days. Self ratings do not award XP. The same review UUID and expected revision are reused after uncertain network outcomes. Each card's receipt and schedule mutate atomically; changed payloads and stale distinct intents are rejected.

Quiz outcomes are aggregated once per material concept. Wrong concepts are brought forward for review; correct answers initialize new-card cadence without pretending multiple-choice correctness is an easy self-rating. Final document-answer storage atomically marks a durable review outbox and removes session purge eligibility until all expected card events are applied. The review queue recovers pending outcomes; duplicate events return canonical receipts rather than rescheduling. The normal session TTL is restored after synchronization.

Document progress is separate from the generic text path. XP is granted once per file hash, and its canonical receipt is retained in the stats update, so replay or re-upload cannot award the same document again. Deletion first hides the document and erases its sources/cache, then removes derived cards/sessions. Every read and mutation checks authenticated ownership, including the parent document of a card or citation.

`test:documents` runs extraction, citation/index validation, and outbox-policy tests without network or credentials. `test:providers` includes recall scheduling, event replay, and concurrent CAS tests. An opt-in `LIVE_DOCUMENT_SMOKE=1` check with `--conditions=react-server` and `--grep "live document"` runs real Gemini/cache/quiz/card persistence against isolated temporary owner IDs and cleans up its data. It does not change a real learner account.

OCR regressions run in `test:documents`; UI tests cover explicit mode selection and failure recovery. Set `LIVE_OCR_SMOKE=1` and run the Node-only AI runner with `--conditions=react-server --grep "live OCR"` for synthetic PDF-scan, image, and DOCX checks against Gemini. `LIVE_OCR_STORAGE_SMOKE=1` with `--grep "live extraction-mode migration"` checks legacy preservation and mode-isolated storage, then deletes its temporary documents. OCR text may contain recognition errors; source review remains necessary.

Ajari Gara and Boss Battle remain a later phase, after content-grounding quality and assessment behavior are evaluated; they are not shipped as placeholder screens.

## Email Validation

Registration performs strict ASCII syntax checks, enforces RFC length boundaries, validates domain labels, and requires a receiving MX record. This confirms that the domain can receive mail, not that a specific mailbox exists. Reliable mailbox ownership requires the planned OTP flow; SMTP probing is intentionally not used because it is unreliable, privacy-invasive, and commonly blocked.

## PWA Behavior

The service worker caches only the public shell and same-origin static assets. It explicitly excludes authentication routes, `/app`, API requests, and React Server Component payloads. Personalized data is never stored in the service-worker cache.

See `SECURITY.md` for the threat model and `explanation.md` for the NotebookLM product narrative.
