# DESIGN — Conversational UX Design Brief

## Notes

This project has **no user-facing UI**. It is a backend webhook server. The "interface" is entirely the Messenger conversation thread inside the Facebook app.

Design decisions apply to the **conversational UX** — how the bot communicates.

---

## Conversational Design Goals

- **Accurate** — never invents facts; admits limits
- **Concise** — max 3 sentences, under 300 characters per reply
- **Direct** — no filler phrases, no sycophantic openers
- **Helpful** — routes to admin when it can't answer
- **Trustworthy** — never misleads

---

## Language & Voice

| Rule | Detail |
|------|--------|
| Supported languages | Burmese (Myanmar script) and English only |
| Other languages | Rejected with bilingual notice, no AI used |
| Language matching | Bot replies in same language customer used |
| Burglish | Mixed Burmese+English -> reply in Burmese |
| Burmese voice | Female staff member |
| Burmese endings | ရှင့် or ပါရှင် at end of reply |
| Burmese verb endings | ပါတယ်, ပါ throughout — no bare facts |
| Customer address | No direct address unless name/title known |
| "Are you a bot?" | Answer honestly in one sentence, offer to help |

---

## Reply Length Guidelines

| Query type | Target |
|------------|--------|
| Any reply | Max 3 sentences, under 300 characters |
| Price query | Product + price(s) only, no extras |
| Product list | Categories overview, not all 20 SKUs |
| Escalation | 1 sentence |
| Unknown/off-topic | 1 sentence — admin will answer |

Hard limit: 1900 characters (Messenger cap is 2000 — truncated with `...` if exceeded).

---

## Hardcoded Responses (no AI cost)

| Trigger | English | Burmese |
|---------|---------|---------|
| Greeting (hi, hello, မင်္ဂလာပါ…) | "Hello, I am MerxyLab assistant. How can I help you?" | "မင်္ဂလာပါရှင့်။ ကျမတို့ MerxyLab assistant ဖြစ်ပါသည်။ ဘာများကူညီပေးရမလဲရှင့်?" |
| Admin request | "Admin will answer you shortly. Thank you." | "Admin မှ မကြာမီ ဖြေကြားပေးပါမည်ရှင့်။ ကျေးဇူးတင်ပါသည်။" |
| Photo/attachment (not sticker) | "Thanks for the photo. Admin will review it and get back to you shortly." + Burmese | bilingual |
| Sticker | Ignored silently | — |
| Rate limit reached (26th msg) | Bilingual limit notice | — |
| No AI credits | "Our automated assistant is temporarily unavailable…" | — |
| Unsupported language | Bilingual rejection notice | — |

---

## Rate Limiting & Admin Takeover

- **Rate limit:** 25 messages per customer per server session. Message 26 triggers one notice, bot goes silent after.
- **Admin takeover:** If admin manually sends a message from Page Inbox, bot detects the unknown echo `mid` and silences itself permanently for that customer (until server restart).

---

## Conversation Context

- Last 5 exchanges (10 entries) passed to AI as history
- Follow-up questions work naturally ("what about 3 months?" after asking about Spotify)
- State resets on server restart (acceptable for free tier)

---

## Typing Indicator

- `typing_on` sent to customer before every AI call
- Shows `...` bubble — makes bot feel human and responsive

---

## Error / Edge States

| Scenario | Bot behavior |
|----------|-------------|
| AI API failure | Error logged; no reply sent |
| Sticker received | Silently ignored |
| Unsupported language | Bilingual rejection, no AI used |
| Off-topic question | "Admin will answer" — no AI speculation |
| Message deduplication | Meta retries ignored via seen `mid` tracking (10min TTL) |

---

## Design Reference

- No Figma file. Conversational UX only.
- Reference: Meta Messenger UX guidelines at developers.facebook.com/docs/messenger-platform/design-resources
