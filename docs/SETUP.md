# SETUP — Setup, Testing, Changelog

## Prerequisites

- Node.js 20 LTS (`node --version` -> v20.x)
- npm 10+
- ngrok (for local testing) — `brew install ngrok` or ngrok.com
- Meta Developer account + App configured (see PART A in build plan)

## Install Steps

```bash
# 1. Clone / enter project
cd merxylab-chatbot

# 2. Install dependencies
npm install

# 3. Create .env from example
cp .env.example .env

# 4. Fill .env with real values (see Env Vars section below)

# 5. Fill knowledge.md with your business facts

# 6. Run locally

node server.js
```

## Env Vars

All required. App fails at startup if any missing.

| Key                 | Description                 | Where to get                            |
| ------------------- | --------------------------- | --------------------------------------- |
| `PAGE_ACCESS_TOKEN`        | Facebook Page access token  | Meta App > Messenger > Token Generation |
| `APP_SECRET`               | Meta app secret             | Meta App > Settings > Basic             |
| `VERIFY_TOKEN`             | Your invented secret string | Make it up (e.g. `mybot_verify_2024`)   |
| `ANTHROPIC_API_KEY`        | Anthropic API key           | console.anthropic.com                   |
| `TELEGRAM_BOT_TOKEN`       | Telegram bot token          | Telegram > @BotFather > /newbot         |
| `TELEGRAM_CHAT_ID`         | Telegram channel chat ID    | getUpdates API (negative number)        |
| `UPSTASH_REDIS_REST_URL`   | Upstash Redis REST URL      | upstash.com > DB > Details              |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token    | upstash.com > DB > Details              |
| `PORT`                     | Server port (optional)      | Default: 3000                           |

## How to Run Locally

```bash
# Terminal 1 — start server
node server.js
# -> Listening on port 3000

# Terminal 2 — expose to internet for Meta webhook
ngrok http 3000
# -> copy the https://xxxx.ngrok.io URL
```

Set `https://xxxx.ngrok.io/webhook` as Meta webhook callback URL.
Paste your `VERIFY_TOKEN`. Subscribe to `messages` and `messaging_postbacks`.

## Deploy to Render

1. Push code to GitHub (`.env` excluded — it's in `.gitignore`)
2. Create new Web Service on render.com
3. Connect GitHub repo
4. Build command: `npm install`
5. Start command: `node server.js`
6. Add env vars in Render dashboard (Settings > Environment)
7. Deploy
8. Copy the `https://<app>.onrender.com` URL
9. Update Meta webhook URL in dashboard to Render URL
10. Run `subscribe.js` once (see below)

## Run subscribe.js (one-time after deploy)

```bash
# Set PAGE_ID in the script or pass as env var, then:
node subscribe.js
```

This subscribes your Page to the app so events flow to the webhook.

## Common Errors + Fixes

| Error                              | Cause                                    | Fix                                             |
| ---------------------------------- | ---------------------------------------- | ----------------------------------------------- |
| `403 Forbidden` on GET /webhook    | VERIFY_TOKEN mismatch                    | Check .env VERIFY_TOKEN matches Meta dashboard  |
| `Error: Missing required env var`  | .env not filled                          | Fill all keys in .env                           |
| Meta webhook shows error icon      | Server not running or URL wrong          | Check ngrok/Render URL, confirm `/webhook` path |
| Bot doesn't reply                  | Signature check failing or echo filtered | Check Render logs for error messages            |
| `UnauthorizedError` from Anthropic | Bad API key                              | Check ANTHROPIC_API_KEY in .env / Render        |

---

## Testing

### Test Framework

No automated test suite in MVP. Manual testing sequence:

### Manual Test Sequence

1. Start server + ngrok locally
2. Set ngrok URL as Meta webhook — confirm GET verification passes (green checkmark)
3. From your admin Facebook account, send a message to your Page
4. Confirm bot reply appears in Messenger within 10s
5. Test with a question covered in knowledge.md — verify accurate answer
6. Test with a question NOT in knowledge.md — verify escalation message
7. Deploy to Render, repeat steps 2-6 with Render URL

### Coverage Target

80%+ coverage required if automated tests are added. Use Jest for unit tests.

### TDD Workflow (if adding tests)

1. Write failing test (RED)
2. Implement to pass (GREEN)
3. Refactor (IMPROVE)
4. Run `npm test` — must pass

---

## Changelog

### [0.4.0] — 2026-06-11

#### Changed

- Business pivot: digital subscriptions → PC gaming accessories (keyboards, mice, headsets, switches, keycaps, accessories)
- knowledge.md: 100+ SKUs with prices in Ks, MerxyLab branding
- knowledge.md: policies — KBZ Pay / AYA Pay / UAB Pay / COD, 1-5 day delivery, same-day Mandalay, 6-month warranty, exchange only within 7 days
- knowledge.md: BeeExpress delivery fee table by region (14 regions, 3,000–10,000 Ks)
- knowledge.md: compressed to pipe-delimited format — 401 lines → 171 lines, ~45% token reduction
- Purchase flow: 2-step → 4-step (confirm → address → region picker → payment method)
- Region picker: numbered list 1-14, bot looks up BeeExpress fee per region
- Payment card: product price + delivery fee + total shown; per-method account details
- BUY token: `[BUY: product | duration | price]` → `[BUY: product | variant | price]`
- ai.js: store description, BUY token examples, few-shot examples updated for PC accessories
- Deployed to Hostinger Business at adminchatbot.merxylab.com

### [0.3.1] — 2026-06-11

#### Security

- POST /telegram: validates X-Telegram-Bot-Api-Secret-Token header (APP_SECRET) — rejects unauthorized requests with 403
- telegram-setup.js: registers webhook with secret_token so Telegram signs all updates
- PSID validated as 10-20 digit number before Redis clearCooldown call
- Redis failure now logs explicit error instead of silently bypassing cooldown
- PSID masked in all server logs (shows last 4 digits only)

### [0.3.0] — 2026-06-11

#### Added

- Upstash Redis persistent cooldown state (25h TTL per PSID)
- `redis.js` — cooldown helpers: setCooldown, isInCooldown, clearCooldown, setNotified, hasBeenNotified
- `POST /telegram` endpoint — receives admin `/on {psid}` re-enable commands
- `telegram-setup.js` — one-time Telegram webhook registration script
- Admin re-enable: summaries include `To re-enable bot: /on {psid}` command
- Cooldown triggers: inactivity timeout, admin takeover, photo received, rate limit

#### Changed

- `adminTakeover` in-memory Set replaced by Redis cooldown (survives restarts)
- All summary types (conversation, photo, rate limit) now set 25h Redis cooldown
- Rate limit lowered: 25 → 20 messages per customer
- Repeat detection: skip for short responses (<=10 chars), yes/no patterns, emails (@)
- Purchase flow confirmation: repeat detection skipped when flow active

#### Fixed

- `yes`/`no` triggering duplicate detection during purchase confirmation
- Email address triggering duplicate detection during purchase flow

### [0.2.3] — 2026-06-11

#### Security

- PAGE_ACCESS_TOKEN moved from URL query param to Authorization: Bearer header (sendTyping + sendMessage)
- Message text capped at 500 chars before AI call — prevents token cost abuse
- Daily setInterval clears messageCount, firstTimeSenders, conversationHistory — prevents unbounded memory growth

#### Fixed

- greetingReply Burmese: ကျွန်တော်တို့ → ကျွန်မတို့ (female voice consistency)

### [0.2.2] — 2026-06-11

#### Changed

- System prompt restructured into clear sections (Language / Burmese Voice / Tone / Length / Greetings / Price / Out-of-scope / Examples)
- Burmese voice rules added: female staff voice, ရှင့်/ပါရှင် endings, ပါတယ်/ပါ verb endings, no bare-fact replies
- Burglish (mixed Burmese+English) -> reply in Burmese
- "Are you a bot?" handling added
- Examples section added (5 few-shot examples in Burmese)
- Prompt caching enabled (cache_control: ephemeral on system prompt)
- Out-of-scope Burmese fallback updated to match voice rules

### [0.2.1] — 2026-06-10

#### Changed

- Product categories always returned in English (prevents cutoff on Burmese long text)
- Categories updated: Language Learning, Communication & Meetings, AI & Productivity, Streaming, Video Editing, VPN
- Customer address: ရှင် only — ခင်ဗျာ removed
- Female voice enforced: ကျမတို့ / ကျမ throughout

### [0.2.0] — 2026-06-10

#### Added

- Hardcoded greeting detection (no AI cost)
- Hardcoded admin request detection
- Photo/attachment bilingual reply; stickers ignored
- Rate limiting: 25 messages per customer, bilingual notice
- Admin takeover detection via echo mid tracking
- Conversation history: last 5 exchanges passed to AI
- Typing indicator before every AI call
- Message deduplication via seen mid set (10min TTL)
- Language filter: Burmese + English only; others rejected
- Burmese tone: female voice (ကျမတို့), ပါ particle, ရှင့် ending rule
- Reply length cap: 300 chars in prompt, 1900 char hard truncation
- Product categories in Burmese in knowledge.md
- KBZ Pay updated to Min Ko Naing / 09787753307

#### Changed

- Switched back to Anthropic Claude Haiku 4.5 from Meta Llama API
- max_tokens reduced 500 → 300

### [0.1.0] — 2026-06-10

#### Added

- Project documentation scaffolded (PRD, TECH, SCHEMA, DESIGN, PLAN, SETUP)
- .gitignore with node_modules, .env, CLAUDE.md excluded
- server.js, ai.js, subscribe.js, package.json, .env.example, knowledge.md

### [0.1.0] — 2026-06-10

#### Added

- Project documentation scaffolded (PRD, TECH, SCHEMA, DESIGN, PLAN, SETUP)
- .gitignore with node_modules, .env, CLAUDE.md excluded
- server.js, ai.js, subscribe.js, package.json, .env.example, knowledge.md
