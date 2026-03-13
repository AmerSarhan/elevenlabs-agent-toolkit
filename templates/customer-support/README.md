# Customer Support Agent Template

An inbound customer support agent that handles common issues, looks up tickets, and escalates to human agents when needed.

## What This Template Does

- Answers inbound support calls with a natural, professional tone
- Identifies and categorizes customer issues
- Looks up existing tickets and account information
- Resolves common issues directly
- Escalates complex or sensitive issues to human agents
- Collects structured data from every call for reporting

## Files

| File | Purpose |
|------|---------|
| `config.json` | Agent configuration — tools, voice settings, data collection, evaluation |
| `prompt.md` | Agent personality and behavior instructions |

## Setup

### 1. Customize the Prompt

Open `prompt.md` and replace every instance of `[Company]` with your company name. Review the conversation flow and adjust the rules to match your support policies.

Paste the final prompt into the `conversation_config.agent.prompt.prompt` field in `config.json`.

### 2. Configure the Voice

Replace `placeholder_voice_id` in `config.json` with your ElevenLabs voice ID. You can find voice IDs in your ElevenLabs dashboard under Voices.

The default settings (stability 0.4, speed 1.0) produce a natural, conversational tone. Increase stability toward 0.6 if you want a more consistent, controlled sound.

### 3. Set Up the Ticket Lookup Tool

The `lookup_ticket` webhook expects an endpoint that accepts POST requests with a `ticket_number` or `customer_email` field and returns ticket details.

Update in `config.json`:
- `tools[0].webhook.url` — your ticket system API endpoint
- `tools[0].webhook.headers.Authorization` — your API key

The response should include fields like `status`, `created_date`, `description`, and `history` so the agent can summarize the ticket to the customer.

### 4. Set Up the Escalation Transfer

Update the `escalate_to_human` tool with your actual transfer destination:
- `tools[1].transfer.phone_number` — the phone number or SIP address of your human support queue

### 5. Adjust Data Collection

The default data collection fields cover common support metrics. Add or remove fields in `platform_settings.data_collection` based on what your team needs for reporting.

Available fields:
- `customer_name` — captured from conversation
- `issue_category` — billing, technical, shipping, account, product, other
- `issue_description` — free-text summary
- `resolution_status` — resolved, escalated, pending, unresolved
- `sentiment` — positive, neutral, frustrated, angry

### 6. Update ASR Keywords

The `asr.keywords` list helps the speech recognition system accurately capture domain-specific terms. Add product names, feature names, and any terminology specific to your business.

## Tuning Tips

- If the agent talks too much before resolving issues, lower `max_tokens` to 150.
- If the agent interrupts customers, increase `turn_timeout` beyond 15 seconds.
- If the agent sounds too robotic, decrease `stability` to 0.3.
- If the agent sounds too variable between calls, increase `stability` to 0.5.
- Adjust `temperature` (default 0.7) — lower values make responses more predictable, higher values more varied.
