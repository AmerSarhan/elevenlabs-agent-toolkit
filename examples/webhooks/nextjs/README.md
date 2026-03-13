# ElevenLabs Webhooks — Next.js (App Router)

Pre-call and post-call webhook handlers for ElevenLabs Conversational AI, built with Next.js App Router route handlers.

## Setup

1. **Install dependencies**

```bash
npm install next postgres
```

2. **Set environment variables** in `.env.local`:

```env
CRM_API_KEY=your_crm_api_key
CRM_BASE_URL=https://api.yourcrm.com/v1
ELEVENLABS_API_KEY=your_elevenlabs_api_key
ELEVENLABS_AGENT_ID=your_agent_id
DATABASE_URL=postgresql://user:pass@host:5432/dbname
NOTIFICATION_WEBHOOK_URL=https://hooks.slack.com/services/...
```

3. **Place the route handlers** in your App Router directory:

```
app/
  api/
    webhooks/
      elevenlabs/
        pre-call/
          route.ts    ← contents of pre-call.ts
        post-call/
          route.ts    ← contents of post-call.ts
```

4. **Create the database table** (post-call logging):

```sql
CREATE TABLE call_logs (
    conversation_id  TEXT PRIMARY KEY,
    agent_id         TEXT NOT NULL,
    caller_id        TEXT,
    duration_secs    INTEGER,
    status           TEXT NOT NULL,
    cost_usd         NUMERIC(10, 4),
    summary          TEXT,
    call_successful  TEXT,
    data_collection  JSONB DEFAULT '{}',
    metadata         JSONB DEFAULT '{}',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

5. **Configure the webhook URLs** in the ElevenLabs dashboard under your agent's settings:

- Pre-call: `https://yourdomain.com/api/webhooks/elevenlabs/pre-call`
- Post-call: `https://yourdomain.com/api/webhooks/elevenlabs/post-call`

## How it works

### Pre-call webhook

Runs when an inbound call is received, before the conversation starts. It:

- Looks up the caller in your CRM by phone number
- Fetches recent conversation history from the ElevenLabs API
- Returns dynamic variables and a personalized first message
- Falls back gracefully if any lookup fails or times out (4.5s hard limit)

### Post-call webhook

Runs after the call ends. It:

- Persists call metadata, transcript summary, and data collection results to PostgreSQL
- Sends a Slack notification if the call was escalated, unsuccessful, or unusually long
