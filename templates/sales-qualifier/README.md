# Sales Qualifier Agent Template

An inbound sales qualification agent that engages prospects, identifies their needs using the BANT framework, and books product demos with your sales team.

## What This Template Does

- Handles inbound sales calls with a natural, consultative tone
- Qualifies leads on Budget, Authority, Need, and Timeline
- Books product demos by checking calendar availability
- Sends pricing, case studies, or product info on request
- Collects structured lead data for your CRM

## Files

| File | Purpose |
|------|---------|
| `config.json` | Agent configuration — tools, voice settings, data collection, evaluation |
| `prompt.md` | Agent personality, qualification framework, objection handling |

## Setup

### 1. Customize the Prompt

Open `prompt.md` and replace:
- `[Company]` — your company name
- `[Product/Service]` — what you sell
- `[Senior Rep / Product Expert]` — the title of who runs demos
- `[specific feature]` — key features to mention during positioning

Paste the final prompt into `config.json` at `conversation_config.agent.prompt.prompt`.

### 2. Configure the Voice

Replace `placeholder_voice_id` with your ElevenLabs voice ID.

The default settings (stability 0.35, speed 1.05) produce an energetic, natural conversational style suited for sales. If the agent sounds too casual, increase stability to 0.45.

### 3. Set Up Calendar Integration

The `check_availability` and `book_demo` tools need a calendar API. Options:
- Connect to Calendly, Cal.com, or HubSpot meetings API
- Build a simple wrapper around Google Calendar API
- Use your existing scheduling system's API

Update the webhook URLs and authorization headers in `config.json`.

**check_availability** should accept `date_from`, `date_to`, and `timezone`, and return available time slots.

**book_demo** should accept lead details and a datetime, create the calendar event, and send the invite.

### 4. Set Up Info Sending

The `send_info` tool sends materials to prospects. Update the webhook to connect to your email/marketing system. It should:
- Accept an email address and info type (pricing, case_study, product_overview, comparison)
- Send the appropriate pre-built email template with attachments
- Log the send in your CRM

### 5. Update ASR Keywords

Add your product names, feature names, competitor names, and industry terminology to `asr.keywords` for better speech recognition accuracy.

### 6. Adjust Data Collection

The default fields map to standard BANT qualification. Customize the `company_size` and `budget_range` enums to match your market:
- For enterprise sales, adjust budget ranges upward
- For SMB, adjust company size ranges downward

## Tuning Tips

- **Agent talks too much:** Lower `max_tokens` to 150 and add "keep responses under 2 sentences" to the prompt.
- **Agent doesn't qualify deeply enough:** Increase `temperature` to 0.8 for more varied follow-up questions.
- **Agent rushes the conversation:** Change `eagerness` from "eager" to "normal" and increase `turn_timeout`.
- **Agent sounds too variable:** Increase `stability` to 0.45-0.5.
- **Prospects getting transferred too fast:** Review the qualification check section in the prompt and tighten the criteria.
