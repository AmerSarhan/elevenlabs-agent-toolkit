# ElevenLabs Webhooks — Express.js

Pre-call and post-call webhook handlers for ElevenLabs Conversational AI, built with Express.js routers.

## Setup

1. **Install dependencies**

```bash
npm install express postgres
npm install -D @types/express typescript
```

2. **Set environment variables**:

```env
CRM_API_KEY=your_crm_api_key
CRM_BASE_URL=https://api.yourcrm.com/v1
ELEVENLABS_API_KEY=your_elevenlabs_api_key
ELEVENLABS_AGENT_ID=your_agent_id
DATABASE_URL=postgresql://user:pass@host:5432/dbname
NOTIFICATION_WEBHOOK_URL=https://hooks.slack.com/services/...
```

3. **Mount the routers** in your Express app:

```typescript
import express from "express";
import preCallRouter from "./webhooks/pre-call";
import postCallRouter from "./webhooks/post-call";

const app = express();
app.use(express.json());
app.use(preCallRouter);
app.use(postCallRouter);

app.listen(3000);
```

4. **Create the database table** (see the Next.js README for the SQL schema).

5. **Configure the webhook URLs** in the ElevenLabs dashboard:

- Pre-call: `https://yourdomain.com/webhooks/elevenlabs/pre-call`
- Post-call: `https://yourdomain.com/webhooks/elevenlabs/post-call`

## How it works

The Express versions implement the same logic as the Next.js examples — CRM lookup, conversation history, personalized greeting, post-call logging, and Slack notifications — using Express `Router` instances instead of App Router route handlers. See the Next.js README for detailed behavior descriptions.
