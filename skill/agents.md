---
name: elevenlabs-agents
description: Build voice AI agents with ElevenLabs. Use when creating voice assistants, customer service bots, interactive voice characters, or any real-time voice conversation experience.
---

# ElevenLabs Voice Agent Development

You are an expert in building production voice AI agents with ElevenLabs Conversational AI. Apply this knowledge when creating, configuring, debugging, or optimizing voice agents.

## Agent Configuration

### LLM Selection

ElevenLabs-hosted models have zero network hop (lowest latency). External models (via custom LLM) add a network round-trip.

| Model | Latency | Quality | Use Case |
|-------|---------|---------|----------|
| `glm-45-air-fp8` | Lowest | Great | Best speed/quality balance |
| `gemini-2.0-flash-001` | Very Low | Good | Simple, high-volume agents |
| `gpt-4o-mini` | Low | Good | Cost-sensitive |
| `gpt-4.1` | Medium | Excellent | Complex conversations |
| `claude-sonnet-4-6` | Medium | Excellent | Nuanced understanding |

### TTS Selection

**English-only agents MUST use `eleven_flash_v2` or `eleven_turbo_v2`.** Using `v2_5` or `multilingual` variants on English-only agents will be rejected by the API.

| Model | Latency | Notes |
|-------|---------|-------|
| `eleven_flash_v2` | ~75ms | Fastest. English only. |
| `eleven_turbo_v2` | ~100ms | Good balance. English only. |
| `eleven_flash_v2_5` | ~90ms | Multilingual only. |
| `eleven_multilingual_v2` | ~150ms | Highest quality multilingual. |

### Voice Settings

- **Stability**: 0.3–0.5 for conversation (default 0.7 sounds robotic)
- **Similarity boost**: 0.7–0.9
- **Speed**: 1.0–1.1 (never above 1.15)
- **Turn eagerness**: `eager` for sales/support, `normal` for general, `patient` for surveys

### ASR Keywords

Add recognition hints for proper nouns and industry terms:

```json
{
  "keywords": ["CompanyName:2", "ProductName:1.5", "industry_term:1"]
}
```

Weight range: 0.5 (slight hint) to 3.0 (strong hint). Keep under 100 keywords.

## Prompt Engineering

Voice prompts are fundamentally different from text prompts. The agent speaks its responses — they must sound natural when heard, not just when read.

### Structure

Always use this order:

1. **Identity** (first 500 chars) — Name, company, role, personality
2. **Rules** (next 2000 chars) — Critical behavioral rules
3. **Knowledge** (remainder) — Business facts, FAQs, procedures

Front-load critical rules. LLMs pay most attention to the beginning and end of prompts.

### Voice-Specific Rules

Always include these in your prompt:

```
- Speak naturally. No bullet points, numbered lists, or formatted text.
- Never spell out URLs, email addresses, or complex strings.
- Say "What's your name?" not "Can I have your full name please?"
- Never ask for information you already have (check caller_context first).
- Keep responses under 2-3 sentences. Callers can't scroll back.
- If you don't know something, say so. Don't make things up.
- When reading numbers, use natural speech ("about fifteen hundred" not "1,500").
```

### Dynamic Variables

Variables injected by pre-call webhook:

```
{{caller_name}} — Caller's name if known
{{caller_context}} — Full context string about the caller
{{caller_phone}} — Caller's phone number
{{is_returning_caller}} — "true" or "false"
```

Reference them in your prompt:

```
If {{is_returning_caller}} is "true", greet them by name: "Hey {{caller_name}}".
If "false", use a generic greeting.
Context from previous calls: {{caller_context}}
```

### Common Prompt Mistakes

| Mistake | Why It's Bad | Fix |
|---------|-------------|-----|
| "Please provide your full name" | Sounds like a form | "What's your name?" |
| Bullet points in responses | Can't be spoken | Write in sentences |
| "Based on the information you've provided..." | Filler. Wastes time. | Get to the point |
| Long paragraphs | Callers can't absorb walls of speech | 2-3 sentences max |
| Asking for info already in context | Frustrating for returning callers | Check {{caller_context}} first |

## Webhooks

### Pre-Call Webhook

Fires when a call starts, before the agent speaks. You have **5 seconds** to respond.

**Request body:**
```json
{
  "call_sid": "string",
  "caller_id": "+1234567890",
  "called_number": "+0987654321",
  "call_type": "phone_call",
  "agent_id": "string"
}
```

**Response format:**
```json
{
  "type": "conversation_initiation_client_data",
  "dynamic_variables": {
    "caller_name": "John",
    "caller_context": "Returning caller. Plumber. Called 3 times before.",
    "caller_phone": "+1234567890",
    "is_returning_caller": "true"
  },
  "conversation_config_override": {
    "agent": {
      "first_message": "Hey John, AMB Recruitment. How can I help?"
    }
  }
}
```

**Critical patterns:**

1. **Timeout handling** — Use AbortController with 3.5s timeout on every external call:
```typescript
async function fetchWithTimeout(url: string, opts: RequestInit, ms = 3500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
```

2. **Hard timeout** — Race all work against a 4.5s deadline:
```typescript
const result = await Promise.race([
  buildContext(callerId),
  new Promise(resolve => setTimeout(() => resolve(null), 4500)),
]);
```

3. **Always return valid response** — Even on total failure:
```typescript
catch (error) {
  return NextResponse.json({
    type: "conversation_initiation_client_data",
    dynamic_variables: { caller_context: "Could not look up caller." },
    conversation_config_override: {
      agent: { first_message: "Hey there, how can I help?" }
    }
  });
}
```

4. **Filter by caller_id** — Never scan all conversations globally:
```typescript
// WRONG — breaks at scale
fetch(`/convai/conversations?agent_id=${AGENT_ID}`)

// RIGHT — only this caller's conversations
fetch(`/convai/conversations?agent_id=${AGENT_ID}&caller_id=${encodeURIComponent(phone)}`)
```

### Post-Call Webhook

Fires after the call ends. No time pressure.

**Request body includes:**
- `conversation_id` — Use to fetch full transcript
- `call_duration_secs`
- `agent_id`
- `caller_id`

### Tool Webhooks

Tools are webhooks the agent calls mid-conversation. The agent sends a POST with the parameters defined in your tool config and expects a JSON response.

**Tool config:**
```json
{
  "type": "webhook",
  "name": "search_jobs",
  "description": "Search for open job positions matching the caller's trade or skill",
  "api_schema": {
    "url": "https://your-api.com/api/agent/search-jobs",
    "method": "GET",
    "query_params": {
      "q": { "type": "string", "description": "Search query — the trade or skill to search for" }
    }
  }
}
```

**Tool response tips:**
- Return concise data the agent can speak naturally
- Include a `note` field with instructions: "Only share jobs that match the caller's trade"
- Return actionable data, not raw database dumps
- Keep response under 1KB — the LLM processes the entire response

## Data Collection

Extract structured data from conversations automatically. Define fields in your agent config:

```json
{
  "data_collection": {
    "caller_name": {
      "type": "string",
      "description": "The caller's full name",
      "dynamic": true
    },
    "call_type": {
      "type": "enum",
      "description": "The primary purpose of the call",
      "enum": ["new_inquiry", "follow_up", "complaint", "general_question"]
    }
  }
}
```

**Important:** The `value` field in results can be `string | boolean | number | null` — not always a string. Handle this in your code.

## Evaluation Criteria

Post-call quality scoring. Define criteria with `conversation_goal_prompt` (not `description` — that field is ignored):

```json
{
  "evaluation_criteria": [
    {
      "id": "caller_identified",
      "name": "Caller Identified",
      "conversation_goal_prompt": "Did the agent successfully identify the caller's name during the conversation?",
      "type": "prompt"
    }
  ]
}
```

**API gotcha:** `evaluation_criteria_results` is a Record/object. The array version is `evaluation_criteria_results_list`. If you get "forEach is not a function", you're using the wrong field.

## Memory Tools

ElevenLabs has built-in memory tools for persistent caller data:

- `memory_entry_search` — Search stored memories for a caller
- `memory_entry_create` — Save new information about a caller
- `memory_entry_update` — Update existing memory entries
- `memory_entry_delete` — Remove outdated entries

Enable all four in agent config. Add to your prompt:

```
At the start of every call, silently search your memory for any stored information
about this caller. Use what you find to personalize the conversation.

When you learn new information (name, preferences, trade, location), save it
to memory silently. Do not tell the caller you are saving information.
```

Memory tools complement the pre-call webhook — the webhook provides external system data (CRM, call history), while memory provides agent-extracted knowledge.

## Debugging

### Reading Conversation Data

Fetch conversation details:
```
GET /v1/convai/conversations/{conversation_id}
```

Key fields:
- `transcript` — Array of `{ role, message, time_in_call_secs }`
- `analysis.data_collection_results` — Extracted data (Record, not array)
- `analysis.evaluation_criteria_results_list` — Quality scores (array)
- `analysis.transcript_summary` — Auto-generated summary
- `metadata.call_duration_secs` — Call length

### Common Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| Wrong caller name | Pulling from short/invalid conversations | Filter: `>=15s && >=3 messages` |
| Agent asks for known info | Weak model or unclear prompt | Upgrade LLM, add "NEVER ask for info you already have" |
| Irrelevant tool results | No guardrails in tool response | Add `note` field with relevance instructions |
| High latency | Wrong TTS model or slow webhook | Use `eleven_flash_v2`, add timeouts, parallelize |
| `forEach is not a function` | Using `evaluation_criteria_results` (object) | Use `evaluation_criteria_results_list` (array) |
| "English agents must use turbo or flash v2" | Using `v2_5` on English agent | Switch to `eleven_flash_v2` |
| Webhook timeout | No AbortController, sequential calls | Add per-request timeouts + Promise.race |
| Robotic voice | Stability too high | Lower to 0.3–0.5 |

## Latency Optimization

Total turn latency = STT + LLM + TTS + network overhead.

1. **TTS**: Use `eleven_flash_v2` (~75ms vs ~150ms for multilingual)
2. **LLM**: Use ElevenLabs-hosted models (zero network hop). `glm-45-air-fp8` is the best speed/quality balance.
3. **Webhook**: Pre-call under 4.5s. Tools under 3s. Use AbortController + Promise.race.
4. **Prompt**: Shorter prompts = faster LLM inference. Stay under 15K characters.
5. **Tool responses**: Keep under 1KB. The LLM has to process the full response.
6. **max_tokens**: Set to 200-300 for conversation (agents don't need to write essays).

## Cost Breakdown

For a typical 5-minute call:

| Component | % of Cost |
|-----------|-----------|
| Voice (TTS) | ~40% |
| Telephony | ~35% |
| LLM | ~15% |
| STT | ~10% |

LLM is the smallest cost component. Don't over-optimize on model cost at the expense of quality — the difference between `gpt-4o-mini` and `gpt-4.1` is pennies per call, but the quality difference is significant.
