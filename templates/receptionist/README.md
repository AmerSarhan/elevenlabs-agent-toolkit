# Receptionist Agent Template

A front desk receptionist agent that answers incoming calls, identifies callers, routes them to the right department, and takes messages when people are unavailable.

## What This Template Does

- Answers all inbound calls with a professional greeting
- Identifies the caller and their purpose
- Transfers calls to the correct department
- Takes messages when departments or people are unavailable
- Provides business hours and basic company information
- Filters spam and solicitation calls

## Files

| File | Purpose |
|------|---------|
| `config.json` | Agent configuration — tools, voice settings, data collection, evaluation |
| `prompt.md` | Agent personality, routing logic, message-taking flow |

## Setup

### 1. Customize the Prompt

Open `prompt.md` and replace:
- `[Company]` — your company name
- `[Your Office Address]` — your office address for callers who ask

Review the routing logic table and adjust departments to match your organization.

Paste the final prompt into `config.json` at `conversation_config.agent.prompt.prompt`.

### 2. Configure the Voice

Replace `placeholder_voice_id` with your ElevenLabs voice ID. Choose a voice that sounds professional and clear — a good receptionist voice is warm but not overly casual.

Default settings (stability 0.4, speed 1.0) work well for a receptionist. Increase stability to 0.5 if you want a more consistent, polished sound.

### 3. Set Up Department Transfers

The `transfer_to_department` tool has a `phone_number_map` that routes to different numbers based on the department. Update each number:

```json
"phone_number_map": {
  "sales": "+1-XXX-XXX-XX01",
  "support": "+1-XXX-XXX-XX02",
  "billing": "+1-XXX-XXX-XX03",
  "hr": "+1-XXX-XXX-XX04",
  "general": "+1-XXX-XXX-XX00"
}
```

Add or remove departments as needed. If you use SIP addresses instead of phone numbers, replace the phone numbers with SIP URIs.

### 4. Set Up Hours Checking

The `check_hours` tool queries your business hours API. This can be:
- A simple endpoint that returns today's hours per department
- A static JSON response if your hours rarely change
- An integration with your calendar system for holiday awareness

### 5. Set Up Message Taking

The `take_message` webhook should:
- Store the message in your system (CRM, email, Slack, etc.)
- Notify the recipient that they have a message
- Include caller name, company, callback number, message content, and urgency

Common integrations: send a Slack message, create a CRM task, or forward an email.

### 6. Update ASR Keywords

Add the names of departments, key employees, and any company-specific terms that callers might use. This is especially important for proper nouns and names that the speech recognition might otherwise miss.

## Why glm-45-air-fp8?

This template uses `glm-45-air-fp8` instead of GPT-4.1 because receptionist conversations are short and straightforward — identify, route, done. The faster model reduces latency, which matters for a receptionist where callers expect quick responses. If you find the agent struggling with complex routing decisions, switch to `gpt-4.1`.

## Tuning Tips

- **Agent sounds too casual:** Increase `stability` to 0.5 and lower `temperature` to 0.3.
- **Agent takes too long to respond:** Verify you are using `glm-45-air-fp8` and lower `max_tokens` to 100.
- **Agent asks too many questions before routing:** Simplify the routing logic in the prompt — fewer categories means faster routing.
- **Callers get transferred to wrong department:** Add more explicit examples in the routing table and add relevant keywords to `asr.keywords`.
- **Agent misses caller names:** Add common names and your frequent callers' company names to `asr.keywords`.
