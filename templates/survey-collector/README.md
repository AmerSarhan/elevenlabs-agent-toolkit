# Survey Collector Agent Template

A phone survey agent that collects structured feedback through three rated questions with follow-up commentary, an overall satisfaction check, and open-ended comments. Designed for short post-service feedback calls that stay under three minutes.

## What This Template Does

- Collects 1-to-5 ratings for three customizable questions
- Captures open-ended feedback after each rating
- Records overall satisfaction (five-point scale from very dissatisfied to very satisfied)
- Collects additional comments and suggestions
- Handles refusals and skipped questions gracefully
- Paces the conversation with patient turn-taking to keep respondents comfortable

Best for: post-service surveys, NPS collection, customer satisfaction checks, event feedback, product experience reviews.

## Files

| File | Purpose |
|------|---------|
| `config.json` | Agent configuration — voice settings, data collection fields, evaluation criteria |
| `prompt.md` | Agent personality, question flow, rating interpretation, pacing rules, refusal handling |

## Setup

### 1. Customize the Survey Questions

Open `prompt.md` and replace the three question placeholders with your actual survey topics. Examples:

- **Overall Experience** — "How would you rate your overall experience with [Company]?"
- **Customer Service** — "How would you rate your interaction with our team?"
- **Value for Money** — "How would you rate the overall value for what you paid?"
- **Product Quality** — "How would you rate the quality of the product you received?"
- **Delivery Experience** — "How would you rate the delivery process?"
- **Ease of Use** — "How would you rate how easy our product is to use?"

Replace `[Company]` with your company name throughout.

Paste the final prompt into `config.json` at `conversation_config.agent.prompt.prompt`.

### 2. Configure the Voice

Replace `placeholder_voice_id` with your ElevenLabs voice ID. Pick a voice that sounds calm and neutral — survey agents should not sound overly enthusiastic or corporate.

The default settings (stability 0.5, speed 1.0) produce a steady, even tone. This is intentional: surveys benefit from consistency more than expressiveness. If the agent sounds too flat, lower stability to 0.4.

### 3. Customize Data Collection Fields

The default config collects `q1_rating`, `q1_feedback`, `q2_rating`, `q2_feedback`, `q3_rating`, `q3_feedback`, `overall_satisfaction`, and `additional_comments`. If you change the number of questions:

- Add or remove `qN_rating` and `qN_feedback` field pairs in `platform_settings.data_collection`
- Update the prompt to match
- Update `evaluation_criteria` — the `all_questions_asked` criterion should reflect your actual question count

### 4. Update ASR Keywords

Add terms specific to your survey domain. If you are surveying about a restaurant, add menu item names. If surveying about software, add feature names and technical terms. The defaults cover general survey vocabulary.

### 5. Configure Outbound Calling

Survey agents are typically outbound. To use this with ElevenLabs phone numbers:

1. Set up a phone number in the ElevenLabs dashboard
2. Use the outbound call API to initiate calls:

```bash
curl -X POST https://api.elevenlabs.io/v1/convai/twilio/outbound-call \
  -H "xi-api-key: $ELEVENLABS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "your_agent_id",
    "agent_phone_number_id": "your_phone_number_id",
    "to_number": "+15551234567"
  }'
```

3. Build a script to iterate through your respondent list, calling each number with appropriate spacing between calls.

## Data Collection Fields

| Field | Type | Values | Description |
|-------|------|--------|-------------|
| `respondent_name` | string | free text | Name of the person being surveyed |
| `q1_rating` | enum | 1-5, skipped | Rating for question 1 |
| `q1_feedback` | string | free text | Open-ended follow-up for question 1 |
| `q2_rating` | enum | 1-5, skipped | Rating for question 2 |
| `q2_feedback` | string | free text | Open-ended follow-up for question 2 |
| `q3_rating` | enum | 1-5, skipped | Rating for question 3 |
| `q3_feedback` | string | free text | Open-ended follow-up for question 3 |
| `overall_satisfaction` | enum | very_dissatisfied to very_satisfied | Overall satisfaction level |
| `additional_comments` | string | free text | Any extra feedback or suggestions |

## Customization

### Changing the rating scale

If you use 1-10 or a Likert scale instead of 1-5, update:
- The prompt (rating scale explanation and word-to-number mapping)
- The `enum` values in each `qN_rating` field in `config.json`

### Adding branching logic

The default template asks all questions in sequence. For conditional follow-ups (e.g., only ask question 3 if question 1 rating is below 3), add branching instructions to the prompt's conversation flow section.

### Using for inbound surveys

If respondents call you (e.g., post-IVR survey), change the `first_message` to something like: "Thanks for staying on the line. We have three quick questions about the help you just received. Shall we go ahead?"

## Why Patient Eagerness?

This template uses `"eagerness": "patient"` instead of the default `"normal"`. Survey respondents often need a moment to think about their rating before answering. Eager turn-taking makes the agent jump in during pauses, which feels pressuring and leads to lower completion rates.

If you find the agent waits too long after respondents finish speaking, switch to `"normal"`.

## Why glm-45-air-fp8?

Survey conversations follow a predictable structure: ask question, record answer, move to next question. There is no complex reasoning, no multi-step problem solving, no need to synthesize information from multiple sources. The `glm-45-air-fp8` model handles this well at lower latency than GPT-4.1, and the cost difference matters when running hundreds of survey calls.

## Tuning Tips

- **Low completion rates:** Check if the agent sounds rushed. Lower the speed to 0.95 and ensure the prompt has adequate pauses between transitions.
- **Respondents give one-word answers:** The follow-up prompts may be too generic. Customize them per question to be more specific to the topic.
- **Agent repeats the rating scale every question:** Add emphasis in the prompt that the scale only needs to be explained for question 1.
- **Agent sounds too robotic for surveys:** Lower stability to 0.4. Surveys need warmth, even if the structure is rigid.
- **Respondents hang up early:** Shorten the opening. The first message should communicate brevity — "just three quick questions, two minutes tops."
- **Data collection fields are empty after calls:** Ensure the field names in `config.json` exactly match what the prompt instructs the agent to collect. See the [troubleshooting guide](../../docs/troubleshooting.md#data-collection-fields-empty-after-call).
- **Agent tries to help with issues instead of surveying:** Strengthen the boundary in the prompt — "You are collecting data, not providing support."
