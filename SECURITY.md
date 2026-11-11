# NalarAI Security Architecture

## Trust Boundaries

NalarAI treats the browser, all request payloads, generated AI text, and forwarded network headers as untrusted. Authentication, answer validation, score calculation, and persistence happen on the Next.js server.

```text
Browser -> Next.js validation/auth boundary -> MongoDB
                                  |
                                  -> Groq model pool -> Gemini fallback over HTTPS
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
- Database failures do not serialize MongoDB topology classes, Maps, or internal connection details to React clients.
- A database outage cannot authenticate a cached cookie locally or authorize an unmetered Groq request; only connection establishment is retried, not business writes.

## Learning Integrity

- Groq and Gemini are called only from the server through their official SDKs.
- API keys remain server-only; Groq automatic retries are disabled and each paid attempt needs its own reservation.
- Groq streamed JSON and Gemini structured JSON are independently validated before persistence.
- Provider/model/token metadata is stored in a private session field, never alongside public answer choices.
- Public question objects do not contain correct options or explanations.
- A learner gets one committed answer per question.
- Reward writes include generated-session IDs, preventing duplicate XP awards.
- Progress updates use set semantics, preventing duplicate path completion.
- Client-supplied XP, scores, streaks, or correct-answer claims are never trusted.

## Groq Token Budgets

- The internal limit is at most 200,000 input + output tokens per exact model ID per UTC day, shared across all users and workers.
- MongoDB reserves the complete conservative input/output bound before a paid call using a single guarded update and majority/journaled acknowledgement.
- Settlement uses reservation ID, amount, and state in one `$elemMatch`, so duplicate responses cannot charge or refund twice.
- Terminal IDs remain until day-document cleanup; a unique partial index prevents cross-model ID replays.
- Unknown outcomes stay reserved or are charged conservatively. Restarts, timeout, age, or missing usage never grant a refund.
- Paid invalid content consumes quota. Accounting overruns quarantine the model and retain the true reported usage.
- The ledger is bounded and cleaned after retention; TTL does not reset an active day's counters.
- Uncertain database acknowledgement prevents Groq dispatch. No process-local counter substitutes for MongoDB.
- The byte/framing input bound applies only to the fixed text-only, two-message template with no tools; changing that template requires reviewing the bound.
- All instances must share the unsharded quota collection and synchronized UTC clocks. Official provider quotas and outside-key usage are separate from this internal guard.

## Private Documents and Review State

- Uploaded originals are not persisted or exposed as public assets; only bounded extracted text is stored under authenticated ownership.
- Uploads are limited to 4 MiB and bounded multipart bytes. Text mode permits PDF/DOCX; explicit OCR permits PDF/DOCX/PNG/JPG, with a ten-page PDF and twenty-megapixel image limit. PDF eval/XFA/external fetching are disabled; DOCX archives and image formats are inspected before AI calls.
- OCR sends original bytes as Gemini inline data only after the user chooses it. Local text mode never triggers AI automatically. Provider processing terms apply; no local public file or persistent Files API object is created.
- OCR output must complete and cover all physical PDF/image units or sequential DOCX sections. Unknown/duplicate indices, unreadable content, malformed statuses, and missing DOCX baseline text are rejected instead of storing a silent partial extraction.
- OCR and text versions have separate document IDs and stable citation histories. Mode-index migration preserves source/template data and creates new uniqueness before removing the old owned constraint.
- Document source text is untrusted data, never an instruction or tool authority. AI-authored URLs, page numbers, and document IDs are not accepted as citations.
- Citation IDs must exist in the selected owned document; server-created page/section locators and escaped plain-text source dialogs provide traceability.
- Generation leases and cached templates limit duplicate paid requests. Private answer keys stay in the session/cache and are not returned with choices.
- Recall rating intents carry stable UUIDs and revisions; receipt and schedule changes are coupled in one card update. Receipt history is retained and bounded, never silently evicted to permit replay.
- Recall self-ratings have no XP reward. Document quiz rewards are scoped by file hash and do not mutate generic path stages.
- Pending completed-quiz review effects are durable and excluded from session TTL until synchronized. Replays cannot reschedule an already applied card event.
- Deleted parents are hidden before derived-data cleanup, and every card/source query checks that the owned parent is still ready. Cross-document deletion is not claimed to be transactional.

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
- `GROQ_API_KEY` and/or `GEMINI_API_KEY`

Rotate the MongoDB credential because it has been shared outside a secret manager. Production MongoDB traffic should use `mongodb+srv://` or a URI with TLS enabled; the supplied plain `mongodb://` endpoint does not itself guarantee encryption in transit.

Rotate AI credentials shared in chat or logs. Keep provider keys outside client bundles and never place them in public-prefixed environment variables.

## Residual Risks and Roadmap

- Email OTP is not implemented yet.
- A plain MongoDB endpoint depends on network-level protection until TLS is enabled.
- AI quality is constrained by the upstream provider; strict schemas prevent malformed structure but cannot prove every educational claim.
- Account recovery, password reset, session management UI, and device audit logs remain future work.
- Rate limiting reduces abuse but is not a substitute for upstream firewalling and observability.

## Reporting

Do not open a public issue containing credentials or personal data. Report sensitive findings privately to the repository owner and include reproduction steps, affected route, and expected impact.
