# PLAN — Implementation Plan + Tasks

## Project Phases

### Phase 1 — Foundation (Days 1-2)
**Goal:** Working server that receives and verifies webhook events from Meta.

**Tasks:**
1. `npm init`, install express, @anthropic-ai/sdk, dotenv
2. Create `.env` + `.env.example` with all required keys
3. Create `server.js` — Express app skeleton, PORT binding
4. Implement GET /webhook — verify_token check, echo challenge
5. Implement POST /webhook — HMAC-SHA256 signature verification
6. Parse entry[].messaging[], filter echoes + receipts
7. Local test: run server, expose with ngrok, pass Meta webhook verification

**Deliverables:** Server receives Meta events, passes verification, ignores non-message events.

**Estimated effort:** 1-2 days

---

### Phase 2 — AI Core (Day 2-3)
**Goal:** Bot reads knowledge.md, calls Claude Haiku, sends reply to sender.

**Tasks:**
1. Create `knowledge.md` placeholder (owner fills in real data)
2. Create `ai.js` — load knowledge.md at startup, build system prompt
3. Implement `generateReply(senderText)` — call Claude Haiku Messages API
4. Wire ai.js into POST /webhook async handler
5. Implement send reply — POST to Graph API /me/messages
6. Create `subscribe.js` — one-time page subscription helper
7. Local test: message Page from admin account, confirm bot replies with knowledge-grounded answer

**Deliverables:** End-to-end working bot on local + ngrok.

**Estimated effort:** 1-2 days

---

### Phase 3 — Deploy + Verify (Day 3-4)
**Goal:** Bot running on Render, accessible publicly (for admin test accounts).

**Tasks:**
1. Create GitHub repo, push code (`.env` excluded)
2. Create Render Web Service, set env vars in dashboard
3. Deploy, confirm server starts
4. Run `subscribe.js` against production PAGE_ID + token
5. Update Meta webhook URL to Render URL
6. Re-run webhook verification in Meta dashboard
7. Message Page from admin account, confirm bot replies on prod
8. Monitor Render logs for errors

**Deliverables:** Production bot on Render responding to admin test messages.

**Estimated effort:** 1 day

---

### Phase 4 — App Review (After stable)
**Goal:** Bot accessible to all Page visitors (requires Meta approval).

**Tasks:**
1. Confirm `pages_messaging` permission requirements in Meta docs
2. Prepare screencast of bot working end-to-end
3. Write use-case description for Meta review
4. Submit app review
5. After approval: test with non-admin account

**Deliverables:** Bot live for all customers.

**Estimated effort:** 1-7 days (Meta review time variable)

---

## Milestone Table

| Milestone | Description | Target Date | Status |
|-----------|-------------|-------------|--------|
| M1: Webhook verified | GET /webhook passes Meta verification | TBD | Not started |
| M2: Messages received | POST /webhook parses events, filters noise | TBD | Not started |
| M3: AI replies | Bot sends Claude Haiku answer to sender | TBD | Not started |
| M4: Prod deploy | Bot live on Render, admin tested | TBD | Not started |
| M5: App Review approved | Bot open to all customers | TBD | Not started |

---

## Dependencies Map

- Phase 2 depends on Phase 1 (webhook must receive events before AI can reply)
- Phase 3 depends on Phase 2 (AI must work locally before deploying)
- Phase 4 depends on Phase 3 (must be stable on prod before review)
- `subscribe.js` depends on Phase 1 deploy (needs production PAGE_ACCESS_TOKEN + PAGE_ID)
- Meta webhook URL must be updated after each URL change (local ngrok -> Render)

---

## Risks + Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Meta App Review rejected | Medium | High | Prepare thorough screencast; follow Meta policy exactly |
| Render free tier cold start causes Meta webhook timeout | Medium | Medium | Render keeps alive with health check ping; or upgrade plan |
| PAGE_ACCESS_TOKEN expires | Low | High | Long-lived token; set reminder to refresh if needed |
| Prompt injection via customer message | Low | Medium | System prompt hardened; knowledge is read-only injection |
| Graph API version deprecated (v21.0) | Low | Medium | Check Meta changelog before finalizing version |

---

## Done Criteria

- **Phase 1 done:** Meta dashboard shows green webhook verification, POST events logged
- **Phase 2 done:** Admin sends message, bot replies within 10s with accurate answer
- **Phase 3 done:** Same test passes on prod Render URL
- **Phase 4 done:** Non-admin stranger can message Page and get bot reply

---

## In Progress

- [ ] Submit App Review for public access (pages_messaging permission)

## Backlog

- [ ] Delivery fee lookup (currently tells customer to ask admin — could add region table)

## Done

- [x] Project planning + documentation scaffolded — 2026-06-10
- [x] Init Node project + install deps — 2026-06-10
- [x] GET /webhook verification — 2026-06-10
- [x] POST /webhook + HMAC-SHA256 signature check — 2026-06-10
- [x] knowledge.md with real business data (20 SKUs, policies, KBZ Pay) — 2026-06-10
- [x] ai.js — Claude Haiku 4.5 integration — 2026-06-10
- [x] Send reply via Graph API — 2026-06-10
- [x] subscribe.js — 2026-06-10
- [x] Async 200-before-AI pattern — 2026-06-10
- [x] Hardcoded greeting detection (no AI cost) — 2026-06-10
- [x] Hardcoded admin request detection — 2026-06-10
- [x] Photo/attachment reply (bilingual, stickers ignored) — 2026-06-10
- [x] Rate limiting (25 msg/customer) — 2026-06-10
- [x] Admin takeover via echo mid detection — 2026-06-10
- [x] Conversation history (last 5 exchanges) — 2026-06-10
- [x] Typing indicator — 2026-06-10
- [x] Message deduplication (seen mid TTL 10min) — 2026-06-10
- [x] Language filter (Burmese + English only) — 2026-06-10
- [x] Burmese tone: female voice, ပါ particle, ရှင့် ending — 2026-06-10
- [x] Reply length enforced (300 chars, 1900 char hard truncation) — 2026-06-10
- [x] Product categories updated + always English response — 2026-06-10
- [x] Customer address: ရှင် only, ခင်ဗျာ removed — 2026-06-10
- [x] Female voice (ကျမတို့) enforced in system prompt — 2026-06-10
- [x] System prompt restructured with sections + examples — 2026-06-11
- [x] Burmese voice rules: ရှင့်/ပါရှင် endings, ပါတယ်/ပါ verbs, no bare facts — 2026-06-11
- [x] Burglish -> Burmese reply rule — 2026-06-11
- [x] Prompt caching (cache_control: ephemeral) — 2026-06-11
- [x] Security: PAGE_ACCESS_TOKEN to Authorization header — 2026-06-11
- [x] Security: message text length cap 500 chars before AI — 2026-06-11
- [x] Security: daily state reset (memory leak fix) — 2026-06-11
- [x] Bug: greetingReply female voice (ကျွန်မတို့) — 2026-06-11
- [x] Conversation logging: logger.js, fullTranscript, inactivityTimers — 2026-06-11
- [x] Telegram channel summaries (conversation end, photo, rate limit) — 2026-06-11
- [x] Redis persistent cooldown (25h TTL, survives restarts) — 2026-06-11
- [x] POST /telegram endpoint + admin /on {psid} re-enable command — 2026-06-11
- [x] telegram-setup.js webhook registration script — 2026-06-11
- [x] Purchase flow: confirm → Gmail → payment card — 2026-06-11
- [x] Repeated question detection (exact match, skip short/email/purchase flow) — 2026-06-11
- [x] Rate limit alert to Telegram with summary — 2026-06-11
- [x] Photo alert to Telegram with conversation context — 2026-06-11
- [x] subscribe.js: added message_echoes field — 2026-06-11
- [x] Security: POST /telegram secret_token auth (APP_SECRET) — 2026-06-11
- [x] Security: PSID format validation before Redis ops — 2026-06-11
- [x] Security: PSID masked in logs — 2026-06-11
- [x] Security: Redis failure explicit error logging — 2026-06-11
- [x] ngrok local testing setup — 2026-06-10
- [x] Meta webhook verified (green checkmark) — 2026-06-10
- [x] Page subscribed to app (messages + messaging_postbacks) — 2026-06-10
- [x] Deployed to Hostinger (adminchatbot.merxylab.com) — 2026-06-11
- [x] Pivot to PC accessories — knowledge.md with 100+ SKUs — 2026-06-11
- [x] Purchase flow: 4-step (confirm → address → region picker → payment method) — 2026-06-11
- [x] Payment methods: KBZ Pay, AYA Pay, UAB Pay, COD — 2026-06-11
- [x] BeeExpress delivery fee table (14 regions) in knowledge.md — 2026-06-11
- [x] Payment card: product + delivery fee + total — 2026-06-11
- [x] knowledge.md compressed to pipe-delimited format (~45% token reduction) — 2026-06-11
- [x] ai.js: store description, BUY token variant format, new examples — 2026-06-11
- [x] knowledge.md: RECOMMENDED section — best picks per category — 2026-06-11
- [x] Purchase flow: multi-item cart (items[], matchAll BUY tokens, subtotal + delivery + total) — 2026-06-11
- [x] Purchase flow: remove region picker — Claude Haiku detects region from address text — 2026-06-11
- [x] Purchase flow: post-order follow-up ("Anything else?") — 2026-06-11
- [x] savedAddresses: address saved after payment, pre-filled on repeat orders, shown in confirm msg — 2026-06-11
- [x] Telegram alerts: delivery address included in conversation/photo/rate-limit summaries — 2026-06-11
