# SCHEMA — Data Models + API

## Data Models

No persistent database in MVP. All state is ephemeral (in-process) or lives in flat files.

### knowledge.md (flat file)

Owner-edited markdown file. Loaded into memory at server startup. Injected into every AI system prompt.

| Section | Content | Notes |
|---------|---------|-------|
| Business name | String | Used in AI greeting |
| Hours | Operating hours per day | Exact text injected |
| Prices | Product/service price list | Never inferred — exact text |
| Policies | Return, delivery, cancellation | Exact text |
| FAQs | Common Q&A pairs | Optional structured section |
| Contact | Phone, email, address | For escalation |

### Environment Config (runtime)

| Key | Type | Source | Notes |
|-----|------|--------|-------|
| PAGE_ACCESS_TOKEN | string | Meta Token Generation | Never logged |
| APP_SECRET | string | Meta App Settings > Basic | Used for HMAC only |
| VERIFY_TOKEN | string | Owner-invented | Compared on GET /webhook |
| ANTHROPIC_API_KEY | string | console.anthropic.com | Never logged |
| PORT | number | Render injects / default 3000 | Optional |

---

## API

### Base URL

```
Local:      http://localhost:3000
Production: https://<app-name>.onrender.com
```

No versioning — single webhook endpoint, not a consumer API.

### Auth

- GET /webhook — no auth (Meta calls this with query params)
- POST /webhook — verified by `X-Hub-Signature-256` HMAC header (not bearer token)

---

### Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /webhook | Meta webhook verification challenge | None (HMAC n/a) |
| POST | /webhook | Receive Messenger events | HMAC-SHA256 |

---

### GET /webhook

Meta calls this when configuring the webhook in the dashboard.

**Query Params:**

| Param | Type | Description |
|-------|------|-------------|
| hub.mode | string | Must equal `"subscribe"` |
| hub.verify_token | string | Must match `VERIFY_TOKEN` env var |
| hub.challenge | string | Echo this back as response body |

**Success Response — 200:**
```
<hub.challenge value as plain text>
```

**Failure Response — 403:**
```
Forbidden
```

---

### POST /webhook

Meta sends Messenger events here.

**Headers:**

| Header | Value |
|--------|-------|
| X-Hub-Signature-256 | `sha256=<hmac_hex>` |
| Content-Type | `application/json` |

**Request Body (example — text message event):**
```json
{
  "object": "page",
  "entry": [
    {
      "id": "<PAGE_ID>",
      "time": 1234567890,
      "messaging": [
        {
          "sender": { "id": "<PSID>" },
          "recipient": { "id": "<PAGE_ID>" },
          "timestamp": 1234567890,
          "message": {
            "mid": "m_<MESSAGE_ID>",
            "text": "What are your hours?"
          }
        }
      ]
    }
  ]
}
```

**Ignored Event Types:**
- `message.is_echo === true` — bot's own sent message echoed back
- `delivery` events — delivery confirmation
- `read` events — read receipt
- Events with no `message.text` — stickers, images, audio (MVP: skip silently)

**Success Response — 200:**
```
EVENT_RECEIVED
```
Sent immediately before async processing.

**Error Response — 403:**
```
Forbidden
```
Sent if HMAC signature is invalid.

---

### Outbound: Messenger Send API

Bot sends reply via:

```
POST https://graph.facebook.com/v21.0/me/messages?access_token=<PAGE_ACCESS_TOKEN>
```

**Request Body:**
```json
{
  "recipient": { "id": "<sender_PSID>" },
  "message": { "text": "<ai_reply_string>" }
}
```

**Note:** Verify current Graph API version at https://developers.facebook.com/docs/graph-api/changelog before finalizing `v21.0`.

---

### Outbound: Page Subscription (subscribe.js)

One-time call to subscribe Page to app events:

```
POST https://graph.facebook.com/v21.0/<PAGE_ID>/subscribed_apps
  ?access_token=<PAGE_ACCESS_TOKEN>
  &subscribed_fields=messages,messaging_postbacks
```

Run once after deploy. Not an HTTP endpoint in the server.

---

## Error Response Format

No structured JSON error format — this is a webhook receiver, not a consumer API. HTTP status codes:

| Status | Meaning |
|--------|---------|
| 200 | Event received (always, even for ignored events) |
| 403 | Signature mismatch or bad verify_token |

---

## Rate Limiting

No rate limiting in MVP. If a single PSID sends high volume, requests queue in Node event loop. Add per-sender rate limiting in v2 if needed.
