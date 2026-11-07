# NalarAI Security Architecture

## Trust Boundaries

NalarAI treats the browser, all request payloads, generated AI text, and forwarded network headers as untrusted. Authentication, answer validation, score calculation, and persistence happen on the Next.js server.

```text
Browser -> Next.js validation/auth boundary -> MongoDB
                                  |
                                  -> Google Gemini over HTTPS
```

The browser never receives password hashes, session hashes, the MongoDB URI, or an unanswered quiz answer key.

## Authentication

- Passwords are limited to bcrypt's safe 72-byte boundary and hashed with cost factor 12.
- Login uses a dummy bcrypt comparison for unknown accounts to reduce timing-based account discovery.
- Sessions use a random public ID plus a random verifier.
- Only a SHA-256 hash of the verifier and a server-side pepper are stored.
- Cookies are HTTP-only, `SameSite=Lax`, path-scoped to `/`, and `Secure` in production.
- Logout revokes the persisted session, not only the browser cookie.
- Session documents expire automatically through a MongoDB TTL index.

## Request Protection

- Mutation routes reject cross-site `Origin` and `Sec-Fetch-Site` values.
- Development compares the browser origin with the actual request host, not Next.js's internal bind address. Production requires the configured `NEXT_PUBLIC_APP_URL` origin and does not trust forwarded host headers for authorization.
- Invalid origins, mismatched ports, and origins containing credentials, paths, queries, or fragments are rejected.
- JSON content type and request size are enforced.
- Zod rejects unknown keys and bounds every public string and array.
- Mongo-backed rate limits work across application instances and expire through TTL indexes.
- Errors returned to clients are sanitized; server logs include error classes, not secrets or raw credentials.

## Learning Integrity

- Gemini is called only from the server through the official `@google/genai` SDK.
- The API key remains server-only; requests have a 90-second deadline and two bounded attempts.
- Raw JSON is required and then schema-validated before persistence.
- Public question objects do not contain correct options or explanations.
- A learner gets one committed answer per question.
- Reward writes include generated-session IDs, preventing duplicate XP awards.
- Progress updates use set semantics, preventing duplicate path completion.
- Client-supplied XP, scores, streaks, or correct-answer claims are never trusted.

## Browser Security

Global response headers enforce:

- Content Security Policy with no plugins or framing
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- strict referrer policy
- restrictive permissions policy
- HSTS in production

The service worker never caches API calls, auth screens, authenticated app pages, RSC responses, or any response carrying `Set-Cookie`.

## Email Assurance

Registration verifies syntax and the presence of a receiving MX record. It does not claim that a mailbox is owned by the registrant. Mailbox ownership will require OTP verification. SMTP mailbox probing is intentionally excluded because providers frequently return ambiguous responses and probing can violate provider policy.

## Secrets

Required secrets live only in `.env` locally or the deployment platform's secret manager:

- `MONGODB_URI`
- `SESSION_PEPPER`

Rotate the MongoDB credential because it has been shared outside a secret manager. Production MongoDB traffic should use `mongodb+srv://` or a URI with TLS enabled; the supplied plain `mongodb://` endpoint does not itself guarantee encryption in transit.

## Residual Risks and Roadmap

- Email OTP is not implemented yet.
- A plain MongoDB endpoint depends on network-level protection until TLS is enabled.
- AI quality is constrained by the upstream provider; strict schemas prevent malformed structure but cannot prove every educational claim.
- Account recovery, password reset, session management UI, and device audit logs remain future work.
- Rate limiting reduces abuse but is not a substitute for upstream firewalling and observability.

## Reporting

Do not open a public issue containing credentials or personal data. Report sensitive findings privately to the repository owner and include reproduction steps, affected route, and expected impact.
