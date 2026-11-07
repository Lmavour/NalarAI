# NalarAI

NalarAI is a mobile-first, gamified learning PWA built with Next.js App Router. It turns any topic into bite-sized Indonesian lessons and interactive quizzes using the official Google Gemini SDK, then persists XP, hearts, streaks, path progress, and league state in MongoDB.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Public landing page with product story, feature previews, CTAs, and PWA install control |
| `/auth` | Email/password registration and login |
| `/app` | Authenticated learning path, quizzes, league, and profile dashboard |
| `/api/auth/*` | Register, login, logout, and session endpoints |
| `/api/lesson-sessions` | Authenticated server-side lesson generation |
| `/api/lesson-sessions/[id]/answer` | One-attempt answer validation and rewards |
| `/api/progress` | Current learner progress and gamification state |

## Stack

- Next.js 16 App Router and React 19
- TypeScript in strict mode
- Tailwind CSS 4 with a custom sapphire design system
- MongoDB with Mongoose
- bcrypt password hashing and opaque HTTP-only sessions
- Google Gemini through the official server-side `@google/genai` SDK
- Manual service worker and web app manifest
- Playwright using an existing local Chromium executable

No OpenAI or Google SDK is used.

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
PLAYWRIGHT_CHROMIUM_PATH="C:\\path\\to\\an-existing\\chrome.exe"
```

Generate the session pepper with:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Never commit `.env`. Use a TLS-enabled MongoDB URI in production. Set `NEXT_PUBLIC_APP_URL` to the browser-facing production origin before building; production mutation routes validate against that origin. Development validates the actual request host, so `localhost` and `127.0.0.1` work even when the server binds to `0.0.0.0`.

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
npm.cmd run test:e2e
```

Playwright reads `PLAYWRIGHT_CHROMIUM_PATH` and launches only that existing executable with `--no-sandbox` and `--disable-setuid-sandbox`. It does not install a browser.

## Data Model

| Collection | Responsibility |
| --- | --- |
| `users` | Normalized email, bcrypt hash, timestamps |
| `authsessions` | Hashed opaque session secrets and expiration |
| `userprogresses` | Active topic, completed path stages, activity dates |
| `gamifications` | XP, hearts, streaks, league, idempotent reward receipts |
| `lessonsessions` | Generated material, private answer key, attempts, result receipt |
| `ratelimits` | Mongo-backed fixed-window abuse controls with TTL cleanup |

## AI Contract

The server calls Gemini through `@google/genai` using model `gemini-3.5-flash-lite`, a separate server-owned system instruction, temperature `0.7`, minimal thinking, and structured `application/json` output. Requests have a 90-second deadline and two bounded SDK attempts. The API key never leaves the server. Gemini's JSON is independently validated with Zod before answer keys or lessons are stored.

`npm run test:ai` exercises the Gemini configuration and lesson parser without starting Next.js or a browser. Set `LIVE_AI_SMOKE=1` and run `npm run test:ai -- --grep "live Gemini"` to opt in to a live check using `GEMINI_API_KEY` and `GEMINI_MODEL`; normal regression runs skip external generation.

Correct answers and explanations remain server-side until the learner commits one answer. Duplicate submissions are idempotent, and the same generated session cannot award XP twice.

## Email Validation

Registration performs strict ASCII syntax checks, enforces RFC length boundaries, validates domain labels, and requires a receiving MX record. This confirms that the domain can receive mail, not that a specific mailbox exists. Reliable mailbox ownership requires the planned OTP flow; SMTP probing is intentionally not used because it is unreliable, privacy-invasive, and commonly blocked.

## PWA Behavior

The service worker caches only the public shell and same-origin static assets. It explicitly excludes authentication routes, `/app`, API requests, and React Server Component payloads. Personalized data is never stored in the service-worker cache.

See `SECURITY.md` for the threat model and `explanation.md` for the NotebookLM product narrative.
