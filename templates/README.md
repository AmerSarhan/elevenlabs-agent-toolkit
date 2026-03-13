# Agent Templates

Production-ready configurations for common voice agent use cases. Each template includes everything you need to deploy an agent: configuration, prompt, and setup guide.

## Choosing a Template

| Template | Use Case | LLM | Complexity | Tools Required |
|----------|----------|-----|------------|----------------|
| [Customer Support](customer-support/) | Inbound support calls | gpt-4.1 | Medium | Ticket lookup, transfer |
| [Sales Qualifier](sales-qualifier/) | Lead qualification | gpt-4.1 | High | CRM, demo booking, email |
| [Receptionist](receptionist/) | Call routing & messages | glm-45-air-fp8 | Medium | Transfer, hours check, messaging |
| [Appointment Scheduler](appointment-scheduler/) | Booking management | gpt-4.1 | High | Calendar, SMS, booking system |
| [Survey Collector](survey-collector/) | Feedback collection | glm-45-air-fp8 | Low | None (end_call only) |

**Start simple.** If you're building your first agent, start with the Survey Collector — it has no external tool dependencies and teaches you the basics of prompt design and data collection.

## How to Use

### 1. Copy the config

Each template has a `config.json` that maps to the ElevenLabs agent creation API:

```bash
curl -X POST https://api.elevenlabs.io/v1/convai/agents/create \
  -H "xi-api-key: $ELEVENLABS_API_KEY" \
  -H "Content-Type: application/json" \
  -d @templates/customer-support/config.json
```

Or paste the config into the ElevenLabs dashboard under Agent Settings.

### 2. Customize the prompt

Open `prompt.md` in the template directory. Replace placeholder values (`[Company Name]`, `[Product]`, etc.) with your specifics. Paste the finished prompt into the agent's prompt field.

### 3. Set up tools

If the template uses webhook tools, you'll need to build and deploy the webhook endpoints. See [examples/tools/](../examples/tools/) for reference implementations.

### 4. Set up webhooks

For pre-call and post-call webhooks, see [examples/webhooks/](../examples/webhooks/) for implementations in Next.js, Express, and FastAPI.

### 5. Test

Before going live, work through the [Pre-Launch Checklist](../checklists/pre-launch.md).

## Customizing Templates

Every template is a starting point. Here's what to customize:

- **Prompt**: Always customize. Replace company name, products, services, policies, team names.
- **Voice**: Pick a voice that matches your brand. Adjust stability (0.3-0.5) and speed (1.0-1.1).
- **Data collection**: Add or remove fields based on what you need to extract.
- **Evaluation criteria**: Adjust to match your quality standards.
- **ASR keywords**: Add your company name, product names, industry terms.
- **Tools**: Replace placeholder URLs with your actual API endpoints.

## Deploying Your Agent

Once your agent is configured and tested locally, deploy it for production use.

### Phone Number Setup

1. Go to the ElevenLabs dashboard and navigate to **Phone Numbers**
2. Purchase or connect a phone number
3. Assign your agent to the number
4. Configure the pre-call and post-call webhook URLs

### Webhook Deployment

Your webhook endpoints need to be publicly accessible. Common deployment targets:

| Platform | Cold Start | Best For |
|----------|-----------|----------|
| Vercel (Next.js) | None (edge) | Fastest pre-call response times |
| Railway / Render | ~1-2s first request | Full-stack apps with databases |
| AWS Lambda | ~1-3s first request | High-volume, cost-optimized |
| Self-hosted (VPS) | None | Full control, consistent latency |

For pre-call webhooks, avoid platforms with cold starts — the 5-second timeout leaves no room for a 2-3 second cold start plus your actual logic.

### Environment Variables

Every deployment needs these at minimum:

```env
ELEVENLABS_API_KEY=your_api_key
ELEVENLABS_AGENT_ID=your_agent_id
```

Add tool-specific variables as needed (CRM keys, database URLs, Twilio credentials). See each template's README for the full list.

### Going Live Checklist

Before routing real calls to your agent, run through the [Pre-Launch Checklist](../checklists/pre-launch.md). At minimum:

- [ ] Test 5+ calls end-to-end with real speech (not typed input)
- [ ] Verify all tool webhooks respond within 5 seconds
- [ ] Confirm data collection fields are populated after test calls
- [ ] Review evaluation criteria scores on test calls
- [ ] Set up monitoring and alerting for webhook failures

## Creating Your Own Template

Use any existing template as a base. A complete template needs:

```
your-template/
├── config.json    # Full agent configuration
├── prompt.md      # The agent prompt with customization markers
└── README.md      # Setup guide and customization instructions
```

We welcome contributions — see [CONTRIBUTING.md](../CONTRIBUTING.md).
