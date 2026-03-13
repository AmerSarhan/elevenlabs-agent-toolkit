# Appointment Scheduler Agent Template

A scheduling agent that handles booking, rescheduling, and cancelling appointments over the phone. Checks real-time availability, collects client details, and sends confirmations.

## What This Template Does

- Books new appointments by checking live availability
- Reschedules existing appointments
- Cancels appointments with confirmation
- Sends booking confirmations via SMS or email
- Collects client details and special requirements
- Handles availability conflicts gracefully

## Files

| File | Purpose |
|------|---------|
| `config.json` | Agent configuration — tools, voice settings, data collection, evaluation |
| `prompt.md` | Agent personality, booking flow, availability handling |

## Setup

### 1. Customize the Prompt

Open `prompt.md` and replace:
- `[Company]` — your company name
- **Services Available** section — list your actual services with durations
- **Business Hours** section — your actual operating hours

Paste the final prompt into `config.json` at `conversation_config.agent.prompt.prompt`.

### 2. Configure the Voice

Replace `placeholder_voice_id` with your ElevenLabs voice ID. A clear, professional voice works best for scheduling — callers need to hear dates and times accurately.

### 3. Set Up the Booking System

All four tools need a working booking API. Common options:
- **Cal.com / Calendly API** — good for simple appointment types
- **Acuity Scheduling API** — works well for service-based businesses
- **Custom API over Google Calendar** — flexible for custom requirements
- **Your existing practice management system** — most have APIs

Update all webhook URLs and auth headers in `config.json`.

#### Tool Requirements

**check_availability** — accepts a date range and optional service type, returns available time slots as a list.

**book_appointment** — accepts client details and a time slot, creates the booking, returns an appointment ID.

**cancel_appointment** — accepts an appointment ID or client lookup info, cancels the booking, returns confirmation.

**send_confirmation** — accepts an appointment ID and delivery method (SMS/email), sends the confirmation message.

### 4. Update ASR Keywords

Add your service names, provider names, and location names to `asr.keywords`. The defaults cover common scheduling vocabulary, but domain-specific terms need to be added.

### 5. Customize Data Collection

The default fields cover general scheduling. Add fields relevant to your business:
- For medical: add `insurance_provider`, `date_of_birth`
- For salons: add `preferred_stylist`, `service_addon`
- For consulting: add `company_name`, `topic`

## Tuning Tips

- **Agent reads back too much:** Lower `max_tokens` to 150 and trim the confirmation step in the prompt.
- **Agent doesn't confirm enough:** Add emphasis in the prompt about reading back dates and times.
- **Agent struggles with date parsing:** Add more date-related keywords to `asr.keywords` (month names, "next week", "the week after").
- **Calls take too long:** The flow should be: service > date > details > book > confirm. If the agent adds steps, simplify the prompt.
- **Wrong times being booked:** Make sure your API returns times in the caller's timezone, or add timezone handling to the prompt.
