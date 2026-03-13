# Webhook Guide

ElevenLabs agents support two webhook types: **pre-call** (fires before the agent speaks) and **post-call** (fires after the conversation ends). This guide covers both, with real code, error handling patterns, and production considerations.

## Pre-Call Webhook

### Purpose

The pre-call webhook lets you inject context before the agent speaks its first word. When a call comes in, ElevenLabs sends you the caller's metadata. You respond with dynamic variables and optional config overrides.

This is where you:
- Look up the caller in your CRM
- Personalize the greeting
- Inject account-specific context
- Route to a different agent config based on caller segment

### Request Format

ElevenLabs POSTs to your webhook URL:

```json
{
  "agent_id": "agent_abc123",
  "conversation_id": "conv_xyz789",
  "caller_id": "+15551234567"
}
```

For web widget calls, `caller_id` may be null or contain a custom identifier you set in the widget config.

### Response Format

Return JSON with this structure:

```json
{
  "type": "conversation_initiation_client_data",
  "dynamic_variables": {
    "caller_name": "Sarah Chen",
    "account_status": "active",
    "plan": "Pro",
    "open_tickets": "2",
    "caller_context": "Last called 3 days ago about billing issue — resolved"
  },
  "conversation_config_override": {
    "agent": {
      "first_message": "Hey Sarah, welcome back. How can I help you today?",
      "prompt": {
        "prompt": "You are a support agent. The caller is a returning Pro customer..."
      }
    }
  }
}
```

All fields in `dynamic_variables` must be **strings**. Numbers and booleans get converted to their string representation.

The `conversation_config_override` is optional. If omitted, the agent uses its default config.

### Timeout: 5 Seconds Hard Limit

Your webhook **must** respond within 5 seconds. If it doesn't, ElevenLabs proceeds with the default agent config and no dynamic variables. The caller hears the default `first_message`.

This is a hard limit. There's no retry, no grace period. Design your webhook to always respond in time.

### Implementation: Next.js (App Router)

```typescript
// app/api/elevenlabs/pre-call/route.ts
import { NextRequest, NextResponse } from "next/server";

interface PreCallRequest {
  agent_id: string;
  conversation_id: string;
  caller_id: string;
}

interface CallerData {
  name: string;
  accountStatus: string;
  plan: string;
  openTickets: number;
  lastCallNote: string;
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const body: PreCallRequest = await req.json();
    const { caller_id, agent_id } = body;

    // Parallel lookups with a hard timeout
    const callerData = await fetchCallerData(caller_id);

    const dynamicVariables: Record<string, string> = {
      caller_name: callerData?.name || "",
      account_status: callerData?.accountStatus || "unknown",
      plan: callerData?.plan || "",
      open_tickets: String(callerData?.openTickets || 0),
      caller_context: callerData?.lastCallNote || "",
    };

    // Build personalized first message
    const firstName = callerData?.name?.split(" ")[0];
    const firstMessage = firstName
      ? `Hey ${firstName}, welcome back. What can I help you with?`
      : `Hi there, thanks for calling. What can I help you with?`;

    console.log(`Pre-call webhook completed in ${Date.now() - startTime}ms`);

    return NextResponse.json({
      type: "conversation_initiation_client_data",
      dynamic_variables: dynamicVariables,
      conversation_config_override: {
        agent: {
          first_message: firstMessage,
        },
      },
    });
  } catch (error) {
    console.error("Pre-call webhook error:", error);

    // ALWAYS return a valid response, even on failure
    return NextResponse.json({
      type: "conversation_initiation_client_data",
      dynamic_variables: {
        caller_name: "",
        account_status: "unknown",
      },
    });
  }
}

async function fetchCallerData(
  callerId: string
): Promise<CallerData | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000); // 3s timeout

  try {
    // Run multiple lookups in parallel
    const [contactResult, ticketResult] = await Promise.all([
      fetch(`${process.env.CRM_API_URL}/contacts?phone=${callerId}`, {
        headers: { Authorization: `Bearer ${process.env.CRM_API_KEY}` },
        signal: controller.signal,
      }).catch(() => null),
      fetch(`${process.env.CRM_API_URL}/tickets?phone=${callerId}&status=open`, {
        headers: { Authorization: `Bearer ${process.env.CRM_API_KEY}` },
        signal: controller.signal,
      }).catch(() => null),
    ]);

    const contact = contactResult ? await contactResult.json() : null;
    const tickets = ticketResult ? await ticketResult.json() : null;

    return {
      name: contact?.name || "",
      accountStatus: contact?.status || "unknown",
      plan: contact?.plan || "",
      openTickets: tickets?.count || 0,
      lastCallNote: contact?.lastNote || "",
    };
  } catch (error) {
    // Timeout or network error — return null, don't crash
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
```

### Implementation: Express

```typescript
// src/routes/pre-call.ts
import { Router, Request, Response } from "express";

const router = Router();

router.post("/api/elevenlabs/pre-call", async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const { caller_id, agent_id } = req.body;

    // Hard timeout: if we haven't responded in 4s, send defaults
    const timeoutPromise = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), 4000)
    );

    const dataPromise = fetchCallerData(caller_id);

    const callerData = await Promise.race([dataPromise, timeoutPromise]);

    const dynamicVariables: Record<string, string> = {
      caller_name: callerData?.name || "",
      account_status: callerData?.accountStatus || "unknown",
    };

    const firstName = callerData?.name?.split(" ")[0];

    res.json({
      type: "conversation_initiation_client_data",
      dynamic_variables: dynamicVariables,
      conversation_config_override: {
        agent: {
          first_message: firstName
            ? `Hey ${firstName}, how can I help?`
            : `Hi there, how can I help?`,
        },
      },
    });

    console.log(`Pre-call: ${Date.now() - startTime}ms`);
  } catch (error) {
    console.error("Pre-call error:", error);
    res.json({
      type: "conversation_initiation_client_data",
      dynamic_variables: { caller_name: "", account_status: "unknown" },
    });
  }
});

export default router;
```

### Implementation: FastAPI (Python)

```python
# app/routes/pre_call.py
import asyncio
import time
from fastapi import APIRouter, Request
from httpx import AsyncClient

router = APIRouter()

@router.post("/api/elevenlabs/pre-call")
async def pre_call_webhook(request: Request):
    start = time.time()

    try:
        body = await request.json()
        caller_id = body.get("caller_id", "")

        # Parallel lookups with timeout
        caller_data = await asyncio.wait_for(
            fetch_caller_data(caller_id),
            timeout=3.0
        )
    except (asyncio.TimeoutError, Exception) as e:
        print(f"Pre-call error: {e}")
        caller_data = None

    name = caller_data.get("name", "") if caller_data else ""
    first_name = name.split(" ")[0] if name else ""

    first_message = (
        f"Hey {first_name}, welcome back. How can I help?"
        if first_name
        else "Hi there, thanks for calling. How can I help?"
    )

    print(f"Pre-call completed in {(time.time() - start) * 1000:.0f}ms")

    return {
        "type": "conversation_initiation_client_data",
        "dynamic_variables": {
            "caller_name": name,
            "account_status": caller_data.get("status", "unknown") if caller_data else "unknown",
        },
        "conversation_config_override": {
            "agent": {
                "first_message": first_message,
            }
        },
    }


async def fetch_caller_data(caller_id: str) -> dict | None:
    async with AsyncClient() as client:
        contact_req = client.get(
            f"{CRM_API_URL}/contacts",
            params={"phone": caller_id},
            headers={"Authorization": f"Bearer {CRM_API_KEY}"},
            timeout=2.5,
        )
        tickets_req = client.get(
            f"{CRM_API_URL}/tickets",
            params={"phone": caller_id, "status": "open"},
            headers={"Authorization": f"Bearer {CRM_API_KEY}"},
            timeout=2.5,
        )

        contact_resp, tickets_resp = await asyncio.gather(
            contact_req, tickets_req, return_exceptions=True
        )

        contact = contact_resp.json() if not isinstance(contact_resp, Exception) else {}
        tickets = tickets_resp.json() if not isinstance(tickets_resp, Exception) else {}

        return {
            "name": contact.get("name", ""),
            "status": contact.get("status", "unknown"),
            "open_tickets": tickets.get("count", 0),
        }
```

## Post-Call Webhook

### Purpose

The post-call webhook fires after a conversation ends. Use it to:
- Log call outcomes to your CRM
- Store collected data
- Trigger follow-up workflows (send confirmation emails, create tickets)
- Flag low-quality calls for review
- Update analytics dashboards

### Request Format

ElevenLabs POSTs to your webhook URL. The payload includes:

```json
{
  "agent_id": "agent_abc123",
  "conversation_id": "conv_xyz789",
  "caller_id": "+15551234567",
  "status": "completed",
  "duration_seconds": 187,
  "transcript": [
    {
      "role": "agent",
      "message": "Hey Sarah, welcome back. What can I help you with?",
      "timestamp": 0.0
    },
    {
      "role": "user",
      "message": "I need to update my billing address.",
      "timestamp": 3.2
    }
  ],
  "data_collection_results": {
    "caller_intent": "billing_update",
    "resolution": "resolved",
    "caller_email": "sarah@example.com"
  },
  "evaluation_criteria_results": {
    "greeting_quality": { "score": 9, "rationale": "Agent greeted by name..." },
    "resolution": { "score": 8, "rationale": "Issue was resolved..." }
  },
  "evaluation_criteria_results_list": [
    { "id": "greeting_quality", "score": 9, "rationale": "..." },
    { "id": "resolution", "score": 8, "rationale": "..." }
  ]
}
```

Note the two evaluation result formats:
- `evaluation_criteria_results`: An **object** keyed by criterion ID. Use for individual lookups.
- `evaluation_criteria_results_list`: An **array**. Use for iteration.

### Implementation: Post-Call Handler

```typescript
// app/api/elevenlabs/post-call/route.ts
import { NextRequest, NextResponse } from "next/server";

interface PostCallPayload {
  agent_id: string;
  conversation_id: string;
  caller_id: string;
  status: string;
  duration_seconds: number;
  transcript: Array<{ role: string; message: string; timestamp: number }>;
  data_collection_results: Record<string, string>;
  evaluation_criteria_results: Record<string, { score: number; rationale: string }>;
  evaluation_criteria_results_list: Array<{
    id: string;
    score: number;
    rationale: string;
  }>;
}

export async function POST(req: NextRequest) {
  try {
    const payload: PostCallPayload = await req.json();

    // Process in parallel — don't block the response
    await Promise.all([
      logToDatabase(payload),
      updateCRM(payload),
      checkQualityThresholds(payload),
    ]);

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("Post-call webhook error:", error);
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}

async function logToDatabase(payload: PostCallPayload) {
  // Store the full conversation record
  await db.conversations.create({
    conversationId: payload.conversation_id,
    agentId: payload.agent_id,
    callerId: payload.caller_id,
    status: payload.status,
    duration: payload.duration_seconds,
    transcript: payload.transcript,
    collectedData: payload.data_collection_results,
    createdAt: new Date(),
  });
}

async function updateCRM(payload: PostCallPayload) {
  const { caller_id, data_collection_results } = payload;

  // Update the contact record with collected data
  if (data_collection_results.caller_email) {
    await crmClient.updateContact(caller_id, {
      email: data_collection_results.caller_email,
      lastCallDate: new Date().toISOString(),
      lastCallOutcome: data_collection_results.resolution || "unknown",
    });
  }
}

async function checkQualityThresholds(payload: PostCallPayload) {
  // Use the LIST format for iteration
  const lowScores = payload.evaluation_criteria_results_list.filter(
    (criterion) => criterion.score < 5
  );

  if (lowScores.length > 0) {
    // Flag for human review
    await notifyTeam({
      conversationId: payload.conversation_id,
      callerId: payload.caller_id,
      issues: lowScores.map((s) => `${s.id}: ${s.score}/10 — ${s.rationale}`),
    });
  }
}
```

## Timeout Handling Patterns

The pre-call webhook's 5-second limit is the most common source of webhook failures. Here are patterns to stay within it.

### Pattern 1: AbortController + setTimeout

```typescript
async function fetchWithTimeout(url: string, timeoutMs: number): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}
```

### Pattern 2: Promise.race with Fallback

```typescript
async function fetchWithFallback<T>(
  promise: Promise<T>,
  fallback: T,
  timeoutMs: number
): Promise<T> {
  const timeout = new Promise<T>((resolve) =>
    setTimeout(() => resolve(fallback), timeoutMs)
  );
  return Promise.race([promise, timeout]);
}

// Usage
const callerData = await fetchWithFallback(
  lookupCaller(callerId),
  { name: "", status: "unknown" }, // fallback if timeout
  3000
);
```

### Pattern 3: Cached Lookups

```typescript
import { LRUCache } from "lru-cache";

const callerCache = new LRUCache<string, CallerData>({
  max: 10000,
  ttl: 1000 * 60 * 15, // 15 minutes
});

async function getCaller(callerId: string): Promise<CallerData | null> {
  const cached = callerCache.get(callerId);
  if (cached) return cached;

  const data = await fetchCallerFromCRM(callerId);
  if (data) callerCache.set(callerId, data);
  return data;
}
```

For returning callers (common in support), caching alone can cut your webhook response time from 2-3 seconds to under 10ms.

## Error Handling

**Rule**: Always return a valid response. If your CRM is down, if the database is unreachable, if the caller doesn't exist in your system — return the default response structure with empty/default values. The agent will proceed with its default config, which is always better than a failed call.

```typescript
// This pattern should wrap your entire webhook handler
try {
  // ... your lookup logic
  return buildPersonalizedResponse(callerData);
} catch (error) {
  console.error("Webhook failed:", error);

  // Always return valid structure
  return {
    type: "conversation_initiation_client_data",
    dynamic_variables: {},
  };
}
```

Never:
- Return a 500 status without a body
- Return HTML error pages
- Let unhandled exceptions crash the handler
- Return `null` or an empty body

## Security

### Validating Webhook Requests

ElevenLabs doesn't currently sign webhook payloads with HMAC. To secure your webhook:

1. **Use a secret path**: Instead of `/api/webhook`, use `/api/webhook/a8f3k9x2m` with a random token in the URL.

2. **Check the agent_id**: Validate that the `agent_id` in the request matches your expected agent(s).

```typescript
const ALLOWED_AGENT_IDS = new Set([
  "agent_abc123",
  "agent_def456",
]);

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (!ALLOWED_AGENT_IDS.has(body.agent_id)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  // ... handle webhook
}
```

3. **Rate limit**: Apply rate limiting to prevent abuse. A legitimate webhook should fire once per call.

4. **IP allowlisting**: If your infrastructure supports it, restrict the webhook endpoint to ElevenLabs' IP ranges.

## Performance Checklist

- [ ] External API calls run in parallel (`Promise.all` / `asyncio.gather`), not sequentially
- [ ] Every external call has a timeout (3s max for pre-call, individual calls under 2s)
- [ ] Fallback values exist for every lookup that might fail
- [ ] Returning callers are cached (LRU cache or Redis)
- [ ] Response payload is minimal — only include variables the prompt actually uses
- [ ] Webhook is deployed on a fast platform (edge functions, not cold-starting serverless)
- [ ] Logging includes response time so you can monitor for degradation
- [ ] Error handling never returns an invalid response structure
