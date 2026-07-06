# MerxyLab Messenger Chatbot

Facebook Page AI chatbot for MerxyLab, a gaming and PC accessories store in Myanmar. Auto-answers customer Messenger messages using business facts from `knowledge.md`, runs a guided purchase flow, and hands off to a human admin via Telegram when needed. Never invents prices, hours, or policies.

## Stack

Node.js 20 · Express 4 · Anthropic Claude Haiku 4.5 · Upstash Redis · Render

## What it does

- Answers product / price / policy questions grounded strictly to `knowledge.md` (Burmese + English).
- Guided purchase flow: confirm → address → payment method → payment card → follow-up.
- Yes/no confirmations resolved by regex fast-path, then Haiku for varied natural replies.
- AI region detection from delivery address → delivery fee.
- Closes the order on a "no" follow-up and finalizes (Telegram order summary + cooldown).
- Escalates to a human admin (photo received, rate limit, inactivity, admin takeover) via Telegram.
- Admin re-enables the bot per customer with `/on <PSID>` in Telegram.

See [`docs/system-diagram.html`](docs/system-diagram.html) for an interactive flow map.

## Storage

No SQL database. In-memory `Map`s hold conversation state (wiped daily and on restart). Upstash Redis holds only per-customer cooldown / notified flags (25h TTL).

## Setup

1. `npm install`
2. Copy the required env vars into a local `.env` (see below). Never commit secrets.
3. `npm start` (runs `node server.js`, listens on `PORT`, default 3000).
4. `npm run subscribe` to subscribe the Page to webhook events.

### Required env vars

`PAGE_ACCESS_TOKEN`, `APP_SECRET`, `VERIFY_TOKEN`, `ANTHROPIC_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`. The server exits at startup if any are missing.

## Security

- `POST /webhook` verified with HMAC-SHA256 (`X-Hub-Signature-256`) on every request.
- Server responds `200` before any async AI work (Meta 5s window).
- Secrets via env vars only. `.env` and `env_import.txt` are git-ignored.

## Docs

| Topic              | File             |
| ------------------ | ---------------- |
| Product + App Flow | docs/PRD.md      |
| Tech + ADRs + Sec  | docs/TECH.md     |
| Schema + API       | docs/SCHEMA.md   |
| Conversational UX  | docs/DESIGN.md   |
| Plan + Tasks       | docs/PLAN.md     |
| Setup + Test + Log | docs/SETUP.md    |
| Interactive flow   | docs/system-diagram.html |
