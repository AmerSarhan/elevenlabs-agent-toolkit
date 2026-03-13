# ElevenLabs Webhooks — FastAPI

Pre-call and post-call webhook handlers for ElevenLabs Conversational AI, built with FastAPI.

## Setup

1. **Install dependencies**

```bash
pip install fastapi uvicorn httpx asyncpg pydantic
```

2. **Set environment variables**:

```bash
export CRM_API_KEY=your_crm_api_key
export CRM_BASE_URL=https://api.yourcrm.com/v1
export ELEVENLABS_API_KEY=your_elevenlabs_api_key
export ELEVENLABS_AGENT_ID=your_agent_id
export DATABASE_URL=postgresql://user:pass@host:5432/dbname
export NOTIFICATION_WEBHOOK_URL=https://hooks.slack.com/services/...
```

3. **Mount the routers** in your FastAPI app:

```python
from fastapi import FastAPI
from pre_call import router as pre_call_router
from post_call import router as post_call_router

app = FastAPI()
app.include_router(pre_call_router)
app.include_router(post_call_router)
```

Run with:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000
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

5. **Configure the webhook URLs** in the ElevenLabs dashboard:

- Pre-call: `https://yourdomain.com/webhooks/elevenlabs/pre-call`
- Post-call: `https://yourdomain.com/webhooks/elevenlabs/post-call`

## How it works

The FastAPI versions use `httpx.AsyncClient` for non-blocking HTTP calls and `asyncio.gather` / `asyncio.wait_for` for concurrency and hard timeouts. The pre-call handler enforces a 4.5-second ceiling and returns a graceful fallback if any upstream service is slow. The post-call handler uses `asyncpg` for async database writes.

See the Next.js README for detailed behavior descriptions of each webhook.

## Deployment

### Railway / Render / Fly.io

```bash
# Install production dependencies
pip install -r requirements.txt

# Run with uvicorn
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 2
```

Set environment variables in the platform dashboard. Use `--workers 2` or higher for production to handle concurrent webhook calls.

### Docker

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
```

### Testing locally

```bash
# Start the server
uvicorn main:app --reload --port 8000

# Simulate a pre-call webhook
../../../scripts/test-webhook.sh http://localhost:8000/webhooks/elevenlabs/pre-call
```
