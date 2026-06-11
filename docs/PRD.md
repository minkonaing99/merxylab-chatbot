# PRD — Merxylab Facebook Page AI Chatbot

## Problem Statement

Customers message the Facebook Page with repetitive questions (prices, hours, policies). Manual replies are slow and inconsistent. This bot auto-answers using fixed business facts so no human monitors the inbox 24/7.

## Goals + Success Metrics

| Goal | Metric |
|------|--------|
| Auto-answer common questions | >80% of messages handled without human |
| Fast response | Reply delivered <10s of customer message |
| Factual accuracy | Zero invented prices/policies (grounded to knowledge.md) |
| Zero downtime during business hours | 99%+ uptime on Render |

## Target Users / Personas

- **Customer** — Existing or prospective customer messaging the Page to ask about products, prices, hours, or availability.
- **Page Admin** — Business owner who fills `knowledge.md` and monitors edge cases the bot escalates.

## Feature List

### Core (MVP)

- Webhook verification (GET /webhook)
- Receive + parse Messenger messages (POST /webhook)
- Signature verification (HMAC-SHA256 / X-Hub-Signature-256)
- AI reply grounded to knowledge.md (Claude Haiku)
- Send reply via Messenger Send API
- Ignore echoes, delivery receipts, read receipts
- Async processing (200 returned to Meta before AI call)
- knowledge.md loaded at startup

### Extended (v2)

- Conversation history context (last N turns)
- Handoff to human if bot says "I'll escalate this"
- Admin dashboard showing unanswered/escalated messages
- Multi-language support
- Image/file message handling
- Postback button replies

### Out of Scope

- Proactive outbound messaging
- Instagram / WhatsApp integration (different APIs)
- CRM integration
- Payment processing

## User Stories

- As a customer, I want to ask about prices and get an instant accurate answer, so I don't have to wait for a human.
- As a customer, I want to know if the bot can't answer, so I'm not misled.
- As a page admin, I want to update knowledge.md with new info, so the bot stays accurate without code changes.
- As a page admin, I want the bot to handle 24/7 volume, so I sleep without missing customers.

## Constraints

- **Platform:** Meta Messenger API only (no SMS, no email)
- **24h rule:** Bot can only reply freely within 24h of last customer message
- **App Review:** Public access requires Meta approval for `pages_messaging`; until approved, only Admin/Developer/Tester accounts can test
- **Cost:** Claude Haiku (cheapest Anthropic model), Render free tier
- **Response window:** Meta requires 200 within 5s — async processing mandatory

## Open Questions / Assumptions

- [ ] Confirm current Graph API version (v21.0 or newer)
- [ ] What escalation message should bot send when it can't answer?
- [ ] Should bot use Page name in greeting or stay generic?
- [ ] Knowledge.md update process: manual file edit + redeploy, or hot-reload?
- [ ] Rate limit strategy if a user spams the bot?

## App Flow

### Entry Points

1. Customer sends message to Facebook Page via Messenger
2. Meta POSTs event to `/webhook`

### Core Flow: Customer Query

1. Customer types message in Messenger
2. Meta sends POST to `/webhook` with signed payload
3. Server responds 200 immediately
4. Async: verify signature
5. Parse sender ID + message text
6. Load knowledge context
7. Call Claude Haiku with system prompt + knowledge + customer message
8. POST reply to Messenger Send API
9. Customer sees reply in Messenger

### Auth Gating

- `/webhook` GET — public (Meta verification)
- `/webhook` POST — protected by HMAC-SHA256 signature check (APP_SECRET)
- All other routes — N/A (no user-facing UI)

### State Transitions

| State | Trigger | Next State |
|-------|---------|------------|
| Message received | POST /webhook | Processing |
| Signature invalid | HMAC mismatch | Rejected (no reply) |
| Echo/receipt event | message.is_echo or delivery event | Ignored |
| AI call success | Claude responds | Reply sent |
| AI call failure | API error | Error logged, no reply sent |

### Edge Cases

- **Echo messages:** Ignore — bot's own sent messages come back as echo events
- **Delivery/read receipts:** Ignore — not actionable
- **No message.text:** Ignore — sticker, image, audio not handled in MVP
- **AI timeout:** Log error, do not retry synchronously (avoid double-reply)
- **Meta retry:** Meta retries if it doesn't get 200 — deduplication by message ID needed in v2
