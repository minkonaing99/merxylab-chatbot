# TECH — Architecture, Decisions, Security

## Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Runtime | Node.js 20 LTS | Best-documented Messenger bot ecosystem; async I/O fits webhook pattern |
| Framework | Express 4 | Minimal, widely used, easy raw body access needed for HMAC |
| AI | @anthropic-ai/sdk (Claude Haiku 4.5) | Cheapest Anthropic model; strong instruction-following for grounded Q&A |
| HTTP client | Node 20 native fetch | Outbound calls to Graph API; no extra package needed |
| Config | dotenv | Load secrets from .env at startup |
| Hosting | Render free tier | Free HTTPS URL; auto-deploys from GitHub |

## Folder Structure

```
merxylab-chatbot/
├── server.js          # Express app, GET + POST /webhook, signature check
├── ai.js              # Loads knowledge.md, calls Claude Haiku 4.5
├── subscribe.js       # One-time Page subscription helper script
├── knowledge.md       # Business facts (prices, hours, policies) — owner edits this
├── .env               # Secrets (never committed)
├── .env.example       # Safe template committed to repo
├── .gitignore
├── package.json
├── CLAUDE.md
└── docs/
    ├── PRD.md
    ├── TECH.md
    ├── SCHEMA.md
    ├── DESIGN.md
    ├── PLAN.md
    └── SETUP.md
```

## Request Lifecycle

```
Messenger Customer
    |
    v
Meta Platform
    |  POST /webhook (signed)
    v
Express server.js
    |-- respond 200 immediately
    |-- async: verifySignature(rawBody, APP_SECRET)
    |-- parse entry[].messaging[]
    |-- deduplication check (seen mid set)
    |-- echo detection (admin takeover)
    |-- filter: admin takeover / rate limit / language / attachment / greeting / admin request
    |-- sendTyping (typing_on)
    |-- call ai.js#generateReply(text, isFirst, history)
         |-- build system prompt + inject knowledge.md
         |-- pass conversation history (last 5 exchanges)
         |-- POST to Anthropic API (Claude Haiku 4.5)
         |-- return aiReply string (<300 chars)
    |-- POST to Graph API /me/messages (truncated at 1900 chars)
    v
Messenger Customer sees reply
```

## Technical Goals

- **Response time:** <10s end-to-end (Haiku is fast, ~1-2s)
- **Availability:** 99%+ during business hours (Render free tier spins down after 15min idle — acceptable tradeoff)
- **Cost:** <$0.01 per message at Haiku 4.5 pricing
- **Zero fact invention:** All AI answers grounded to knowledge.md via system prompt

## Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| Meta webhook 200 response | <5s (hard requirement from Meta) |
| AI processing (async) | <10s |
| Uptime | Best-effort free tier |
| Secrets exposure | Zero — all via env vars |
| Signature validation | 100% of POST /webhook requests |

## Integration Points

| Service | Auth Method | Data Contract |
|---------|-------------|---------------|
| Meta Messenger (receive) | HMAC-SHA256 APP_SECRET signature | Webhook event JSON |
| Meta Graph API (send) | Authorization: Bearer PAGE_ACCESS_TOKEN header | Send API JSON body |
| Anthropic API | ANTHROPIC_API_KEY header | Messages API (system + user turn) |

## Scalability Plan

MVP is single-process Node on Render free tier. Sufficient for low-volume Page.

If volume grows:
- Upgrade Render plan (no code changes needed)
- Add message deduplication (Redis or in-memory Map with TTL) to handle Meta retries
- Rate-limit per sender ID to prevent abuse

## Deployment Target

- Platform: Render (render.com)
- Region: Oregon (US West) default
- Process: Web Service, Node 20, `node server.js`
- Env vars set in Render dashboard

## Observability

- `console.log` / `console.error` -> Render log stream
- Log: incoming sender ID (not message content for privacy), AI call success/fail, send API success/fail
- No external APM in MVP

---

## Architecture Decision Records

### [2026-06-10] Use Claude Haiku 4.5 for AI replies
**Status:** Accepted
**Context:** Need cheapest AI that follows strict system prompt grounded to knowledge.md and never invents facts.
**Decision:** Claude Haiku 4.5 (`claude-haiku-4-5-20251001`) via @anthropic-ai/sdk. Strong instruction-following, fractions of a cent per message.
**Consequences:** Requires ANTHROPIC_API_KEY. Easy to swap model ID to Sonnet/Opus if quality needs upgrade without code changes.

### [2026-06-10] Async POST processing — 200 before AI call
**Status:** Accepted
**Context:** Meta disables webhooks that don't respond within 5 seconds. Llama API calls take 1-3s. Total with network overhead risks timeout.
**Decision:** `res.sendStatus(200)` fires before any async work. AI + Send API calls happen after.
**Consequences:** If AI call fails, customer gets no reply and no error is surfaced. Acceptable in MVP; add retry/fallback in v2.

### [2026-06-10] knowledge.md as flat file (not database)
**Status:** Accepted
**Context:** Business facts rarely change. No query needs. Database adds ops overhead.
**Decision:** Single `knowledge.md` file loaded at startup. Redeploy to update.
**Consequences:** No hot-reload of facts. Acceptable for v1. If facts change frequently, switch to hot-reload (watch file) or DB.

---

## Security

### Auth + Authorization

- **Receive (POST /webhook):** HMAC-SHA256 of raw request body using APP_SECRET. Rejects any request with missing or mismatched `X-Hub-Signature-256` header. Raw body must be captured before JSON parsing.
- **Send (Graph API):** PAGE_ACCESS_TOKEN as `Authorization: Bearer` header. Token never appears in URLs or logs.
- **Admin actions (subscribe.js):** Run manually by admin. Not exposed as HTTP endpoint.

### Input Validation

- `hub.mode`, `hub.verify_token`, `hub.challenge` validated in GET handler
- Webhook body: check `object === "page"` before processing
- Skip events missing `message.text` (no crash on sticker/image)
- Sender ID treated as opaque string, not parsed

### Secret Management

All secrets via `.env` (local) or Render env vars (production):
- `PAGE_ACCESS_TOKEN`
- `APP_SECRET`
- `VERIFY_TOKEN`
- `ANTHROPIC_API_KEY`

`.env` in `.gitignore`. `.env.example` committed with no values.

### Known Attack Surfaces

| Surface | Risk | Mitigation |
|---------|------|------------|
| POST /webhook | Spoofed payloads | HMAC-SHA256 signature check |
| Prompt injection via user message | User tricks AI into ignoring system prompt | System prompt hardened; knowledge is read-only context |
| API key exposure | Key in logs or git | Never log tokens; .env gitignored |
| Render free tier cold start | Slow first response after idle | Acceptable; warm-up ping optional |

### Dependency Audit

Run `npm audit` before deploy. Fix CRITICAL/HIGH. Re-run after any `npm install`.
