# LOGGING — Conversation Logging & Summary

## Overview

When a customer conversation ends, the bot generates an AI summary and sends it to a private Telegram group. Admins get a concise report without checking Render logs.

---

## Trigger: Conversation End

A conversation is considered done when **either** condition fires first:

| Condition          | Detail                                                     |
| ------------------ | ---------------------------------------------------------- |
| Inactivity timeout | No message from customer for 30 minutes                    |
| Admin takeover     | Echo mid detected from Page Inbox (admin replied manually) |

---

## Summary Content

Each summary contains:

- **Customer name** — fetched via Graph API PSID lookup at conversation start
- **What they asked** — 1-2 sentence description of the customer's intent
- **Products mentioned** — list of SKUs or categories the customer asked about
- **Resolved** — yes / no / partial
- **Action needed** — any follow-up admin must take (e.g. "customer waiting for payment confirmation")

Language: **English only** (internal admin data).

---

## Delivery

| Channel     | Detail                                              |
| ----------- | --------------------------------------------------- |
| Telegram    | Private group — bot posts formatted summary message |
| Render logs | Not used for summaries                              |

### On Telegram failure

1. Retry once after 30 seconds
2. If still fails: `console.error` with PSID and error message
3. No further retries — summary is informational, not mission-critical

---

## Telegram Message Format

```
Conversation Summary (date)
───────────────────────
Customer: Ko Aung (PSID: 123456789)
Duration: 14 min | Messages: 8
───────────────────────
Asked: Customer asked about Netflix 1-month price and payment method.
Products: Netflix Premium 4K
Resolved: Yes
Action needed: None
───────────────────────
```

---

## Architecture

### New file: `logger.js`

Responsibilities:

- `fetchCustomerName(psid)` — GET Graph API, return display name
- `generateSummary(transcript, customerName)` — call Claude Haiku 4.5, return structured summary text
- `sendTelegram(text)` — POST to Telegram Bot API, retry once on failure
- `finalizeConversation(psid, transcript, trigger)` — orchestrates all three above

### Changes to `server.js`

| Change                 | Detail                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------- |
| `fullTranscript` Map   | `psid -> [{role, text, ts}]` — stores complete conversation (not capped like history) |
| `inactivityTimers` Map | `psid -> setTimeout handle` — 30-min timer per PSID, reset on each message            |
| On message received    | Append to `fullTranscript`, reset inactivity timer                                    |
| On admin takeover      | Cancel inactivity timer, call `finalizeConversation` immediately                      |
| On timer fire          | Call `finalizeConversation`, clear transcript + timer                                 |
| Daily state reset      | Also clears `fullTranscript` + `inactivityTimers`                                     |

---

## Environment Variables

| Key                  | Description               | Where to get                          |
| -------------------- | ------------------------- | ------------------------------------- |
| `TELEGRAM_BOT_TOKEN` | Bot token from @BotFather | Telegram > @BotFather > /newbot       |
| `TELEGRAM_CHAT_ID`   | Private group chat ID     | Add bot to group, call getUpdates API |

Add both to `.env` and Render dashboard.

---

## AI Summary Prompt

Model: `claude-haiku-4-5-20251001`

System: `You are an assistant that summarizes customer service conversations for admin review. Be factual and concise. English only.`

User prompt:

```
Summarize this Messenger conversation between a customer and a MerxyLab bot.

Customer name: {name}
Transcript:
{transcript}

Reply in this exact format:
Asked: <1-2 sentences on what customer wanted>
Products: <comma-separated list, or "None">
Resolved: <Yes / No / Partial>
Action needed: <what admin must do, or "None">
```

---

## Data Privacy

- Customer PSID logged to Render console only at DEBUG level (not in Telegram message)
- Message content not stored to disk — lives in memory only, cleared after summary sent
- Summary sent to private admin group only

---

## Cooldown State (Redis)

After any conversation-ending event, PSID enters a 25-hour cooldown stored in Upstash Redis.

| Key | Value | TTL |
|-----|-------|-----|
| `cooldown:{psid}` | `"1"` | 25 hours |
| `notified:{psid}` | `"1"` | 25 hours |

During cooldown:
- First message from customer → send "Admin will get back to you shortly" (bilingual), set notified flag
- Subsequent messages → silent

After 25 hours → Redis keys auto-expire → bot re-engages normally (fresh start).

### Admin Re-enable (Early)

Every summary message ends with:
```
To re-enable bot: /on {psid}
```

Admin DMs that command to the Telegram bot. Server receives it via `POST /telegram` and calls `clearCooldown(psid)`.

### Cooldown Triggers

| Event | Triggers cooldown? |
|-------|-------------------|
| Inactivity timeout (30 min) | Yes |
| Admin takeover (echo detected) | Yes |
| Photo received | Yes |
| Rate limit reached (20 msg) | Yes |

---

## Environment Variables

| Key | Description | Where to get |
|-----|-------------|--------------|
| `TELEGRAM_BOT_TOKEN` | Bot token from @BotFather | Telegram > @BotFather > /newbot |
| `TELEGRAM_CHAT_ID` | Private channel chat ID | getUpdates API |
| `UPSTASH_REDIS_REST_URL` | Redis REST endpoint | Upstash dashboard > Details |
| `UPSTASH_REDIS_REST_TOKEN` | Redis REST token | Upstash dashboard > Details |

Add all to `.env` and Render dashboard.

---

## Status

- [x] `logger.js` implemented
- [x] `server.js` wired: fullTranscript, inactivityTimers, finalizeConversation
- [x] `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` added to `.env`
- [x] `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` added to `.env`
- [ ] `redis.js` implemented
- [ ] `server.js` wired: Redis cooldown checks, POST /telegram endpoint
- [ ] `logger.js` updated: setCooldown calls + /on command in summaries
- [ ] `telegram-setup.js` run (register webhook URL)
- [ ] All env vars added to Render dashboard
- [ ] Tested locally with ngrok
- [ ] Deployed to Render
