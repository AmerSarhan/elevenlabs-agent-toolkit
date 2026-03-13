<p align="center">
  <img src="https://img.shields.io/badge/ElevenLabs-Agent%20Toolkit-6C47FF?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB4PSI3IiB5PSIzIiB3aWR0aD0iMyIgaGVpZ2h0PSIxOCIgcng9IjEuNSIgZmlsbD0id2hpdGUiLz48cmVjdCB4PSIxNCIgeT0iNyIgd2lkdGg9IjMiIGhlaWdodD0iMTAiIHJ4PSIxLjUiIGZpbGw9IndoaXRlIi8+PC9zdmc+" alt="ElevenLabs Agent Toolkit" />
</p>

<h1 align="center">ElevenLabs Agent Toolkit</h1>

<p align="center">
  <strong>Production-ready templates, checklists, and battle-tested patterns for building voice AI agents with ElevenLabs Conversational AI.</strong>
</p>

<p align="center">
  <a href="#-quick-start">Quick Start</a> ·
  <a href="#-agent-templates">Templates</a> ·
  <a href="#-checklists">Checklists</a> ·
  <a href="#-code-examples">Examples</a> ·
  <a href="docs/architecture.md">Architecture</a> ·
  <a href="docs/prompt-engineering.md">Prompt Guide</a>
</p>

<p align="center">
  <a href="https://github.com/AmerSarhan/elevenlabs-agent-toolkit/stargazers"><img src="https://img.shields.io/github/stars/AmerSarhan/elevenlabs-agent-toolkit?style=flat-square&color=6C47FF" alt="GitHub Stars" /></a>
  <a href="https://github.com/AmerSarhan/elevenlabs-agent-toolkit/network/members"><img src="https://img.shields.io/github/forks/AmerSarhan/elevenlabs-agent-toolkit?style=flat-square" alt="Forks" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/AmerSarhan/elevenlabs-agent-toolkit?style=flat-square" alt="License" /></a>
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square" alt="PRs Welcome" />
  <img src="https://img.shields.io/badge/voice%20AI-agents-blue?style=flat-square" alt="Voice AI Agents" />
</p>

---

> **Ship your ElevenLabs voice agent in hours, not weeks.** This toolkit gives you everything you need — agent configs, production prompts, webhook code, deployment checklists, and hard-won lessons from agents handling real phone calls.

---

## The Problem

Building a voice AI agent that *actually works in production* is harder than the demo suggests:

- Prompts that read well as text sound terrible when spoken aloud
- Webhook timeouts silently kill calls before the agent speaks
- Wrong TTS model choice adds 200ms+ of latency on every turn
- Callers get frustrated when the agent asks for information it already has
- What works for 5 calls/day breaks catastrophically at 500

This toolkit is the shortcut. Everything here comes from shipping real voice agents handling real calls with real customers — not theoretical best practices, not vibe-coded demos.

## What's Inside

| Category | What You Get |
|----------|-------------|
| **5 Agent Templates** | Copy-paste configs with production prompts for customer support, sales, receptionist, scheduling, and surveys |
| **5 Operations Checklists** | Pre-launch, prompt review, voice tuning, security hardening, and scaling guides |
| **6 Webhook Examples** | Pre-call and post-call implementations in Next.js, Express, and FastAPI |
| **4 Custom Tool Examples** | CRM lookup, calendar booking, SMS notifications, database logging |
| **5 Documentation Guides** | Architecture, prompt engineering, voice optimization, webhooks, troubleshooting |
| **1 Claude Code Skill** | AI-assisted agent development with deep ElevenLabs knowledge |

---

## 🚀 Quick Start

### 1. Clone and pick a template

```bash
git clone https://github.com/AmerSarhan/elevenlabs-agent-toolkit.git
cd elevenlabs-agent-toolkit
ls templates/
```

### 2. Deploy the agent

```bash
curl -X POST https://api.elevenlabs.io/v1/convai/agents/create \
  -H "xi-api-key: $ELEVENLABS_API_KEY" \
  -H "Content-Type: application/json" \
  -d @templates/customer-support/config.json
```

### 3. Customize the prompt

Open `templates/<template>/prompt.md`, replace `[Company Name]` and other placeholders with your business details, and update the agent.

### 4. Go through the checklist

Before going live, run through the [Pre-Launch Checklist](checklists/pre-launch.md).

---

## 📋 Agent Templates

Complete, ready-to-deploy agent configurations. Each template includes a `config.json` (full ElevenLabs API config), `prompt.md` (production-tested prompt), and `README.md` (setup and customization guide).

| Template | Description | LLM | Complexity |
|----------|-------------|-----|------------|
| [**Customer Support**](templates/customer-support/) | Inbound support with ticket lookup, issue resolution, and human escalation | gpt-4.1 | ★★☆ |
| [**Sales Qualifier**](templates/sales-qualifier/) | Lead qualification using BANT framework with CRM and demo booking | gpt-4.1 | ★★★ |
| [**Receptionist**](templates/receptionist/) | Front desk agent with call routing, hours check, and message taking | glm-45-air-fp8 | ★★☆ |
| [**Appointment Scheduler**](templates/appointment-scheduler/) | Booking, rescheduling, and cancellation with calendar integration | gpt-4.1 | ★★★ |
| [**Survey Collector**](templates/survey-collector/) | Structured phone surveys with ratings and open-ended feedback | glm-45-air-fp8 | ★☆☆ |

> **New to ElevenLabs?** Start with the Survey Collector — it requires no external tools and teaches you the fundamentals of prompt design and data collection.

---

## ✅ Checklists

Actionable, checkbox-format checklists for every stage of building a voice agent.

| Checklist | When to Use |
|-----------|-------------|
| [**Pre-Launch**](checklists/pre-launch.md) | Before your agent takes its first real call |
| [**Prompt Review**](checklists/prompt-review.md) | After writing or updating your agent's prompt |
| [**Voice Tuning**](checklists/voice-tuning.md) | Dialing in voice settings for natural conversation |
| [**Security**](checklists/security.md) | Hardening your agent against prompt injection and misuse |
| [**Scaling**](checklists/scaling.md) | Preparing for high call volumes (100+ calls/day) |

---

## 💻 Code Examples

### Webhooks — Pre-Call and Post-Call

Production webhook implementations with timeout handling, parallel API calls, graceful error recovery, and caller context enrichment.

| Framework | Pre-Call | Post-Call |
|-----------|----------|-----------|
| **Next.js** (App Router) | [pre-call.ts](examples/webhooks/nextjs/pre-call.ts) | [post-call.ts](examples/webhooks/nextjs/post-call.ts) |
| **Express** | [pre-call.ts](examples/webhooks/express/pre-call.ts) | [post-call.ts](examples/webhooks/express/post-call.ts) |
| **FastAPI** (Python) | [pre_call.py](examples/webhooks/fastapi/pre_call.py) | [post_call.py](examples/webhooks/fastapi/post_call.py) |

### Custom Tools — Webhook-Based Agent Actions

Tools your agent can call mid-conversation to take action:

| Tool | Description | File |
|------|-------------|------|
| **CRM Lookup** | Search contacts by phone or name | [crm-lookup.ts](examples/tools/crm-lookup.ts) |
| **Calendar Booking** | Check availability and book appointments | [calendar-booking.ts](examples/tools/calendar-booking.ts) |
| **SMS Notification** | Send confirmation texts via Twilio | [sms-notification.ts](examples/tools/sms-notification.ts) |
| **Database Logger** | Log structured call data | [database-logger.ts](examples/tools/database-logger.ts) |

---

## 📖 Documentation

| Guide | What You'll Learn |
|-------|-------------------|
| [**Architecture**](docs/architecture.md) | How ElevenLabs agents work — STT → LLM → TTS pipeline, webhooks, tools, and latency breakdown |
| [**Prompt Engineering**](docs/prompt-engineering.md) | Writing prompts for voice — the rules are different from text. Common mistakes and how to fix them |
| [**Voice Optimization**](docs/voice-optimization.md) | TTS model selection, voice stability, speed, turn detection, and ASR keywords |
| [**Webhook Guide**](docs/webhook-guide.md) | Pre-call and post-call webhook patterns with timeout handling and error recovery |
| [**Troubleshooting**](docs/troubleshooting.md) | 15 common issues with causes and fixes — wrong names, high latency, webhook timeouts, and more |

---

## 🔧 Model Quick Reference

### LLM Models (ElevenLabs-Hosted = Zero Network Hop)

| Model | Latency | Quality | Best For |
|-------|---------|---------|----------|
| `gemini-2.0-flash-001` | ⚡ Lowest | Good | High-volume, simple agents |
| `glm-45-air-fp8` | ⚡ Very Low | Great | **Best speed/quality balance** |
| `gpt-4o-mini` | Fast | Good | Cost-sensitive deployments |
| `gpt-4.1` | Medium | Excellent | Complex multi-step conversations |
| `claude-sonnet-4-6` | Medium | Excellent | Nuanced understanding |

### TTS Models

| Model | Latency | Languages | Notes |
|-------|---------|-----------|-------|
| `eleven_flash_v2` | ~75ms | English | **Fastest.** Use this for English agents. |
| `eleven_turbo_v2` | ~100ms | English | Good balance of speed and quality |
| `eleven_flash_v2_5` | ~90ms | 32 languages | Multilingual agents only |
| `eleven_multilingual_v2` | ~150ms | 29 languages | Highest quality, highest latency |

> ⚠️ **English-only agents must use `flash_v2` or `turbo_v2`.** Using `v2_5` or `multilingual` on English agents will be rejected by the API.

---

## 🤖 Claude Code Skill

This toolkit includes a [Claude Code skill](skill/agents.md) that gives Claude expert-level knowledge of ElevenLabs agent development — configuration, prompts, webhooks, debugging, and optimization.

```bash
# Install the skill
claude mcp add-skill https://raw.githubusercontent.com/AmerSarhan/elevenlabs-agent-toolkit/main/skill/agents.md
```

Or copy `skill/agents.md` into your `.claude/skills/` directory.

---

## 🗂️ Project Structure

```
elevenlabs-agent-toolkit/
├── templates/                   # Ready-to-deploy agent configurations
│   ├── customer-support/        #   ├── config.json, prompt.md, README.md
│   ├── sales-qualifier/
│   ├── receptionist/
│   ├── appointment-scheduler/
│   └── survey-collector/
├── checklists/                  # Operational checklists
│   ├── pre-launch.md
│   ├── prompt-review.md
│   ├── voice-tuning.md
│   ├── security.md
│   └── scaling.md
├── docs/                        # Deep-dive documentation
│   ├── architecture.md
│   ├── prompt-engineering.md
│   ├── voice-optimization.md
│   ├── webhook-guide.md
│   └── troubleshooting.md
├── examples/
│   ├── webhooks/                # Next.js, Express, FastAPI
│   ├── tools/                   # CRM, calendar, SMS, logging
│   └── .env.example             # Environment variable reference
├── skill/                       # Claude Code skill
│   └── agents.md
└── scripts/
    └── test-webhook.sh          # Webhook testing utility
```

---

## 🤝 Contributing

We welcome contributions from anyone building with ElevenLabs. See [CONTRIBUTING.md](CONTRIBUTING.md).

**Good first contributions:**
- Add a new agent template (recruitment, healthcare, real estate, e-commerce)
- Add webhook examples in another framework (Flask, Hono, Deno, Go)
- Share real-world tips and troubleshooting solutions
- Add integration examples (Zapier, Make, n8n, Salesforce, HubSpot)

---

## 📄 License

MIT — use this however you want. See [LICENSE](LICENSE).

---

<p align="center">
  <sub>Built by <a href="https://github.com/AmerSarhan">Amer Sarhan</a></sub><br/>
  <sub>If this toolkit saved you time, <a href="https://github.com/AmerSarhan/elevenlabs-agent-toolkit/stargazers">leave a star</a> ⭐</sub>
</p>
