# Contributing

Thanks for your interest in improving the ElevenLabs Agent Toolkit. This project thrives on real-world experience — if you've built voice agents and learned something the hard way, that knowledge belongs here.

## What We're Looking For

**Templates** — New agent templates for use cases we don't cover yet. Each template needs a `config.json`, `prompt.md`, and `README.md`. See [templates/](templates/) for the format.

**Webhook Examples** — Implementations in frameworks we don't have yet (Flask, Hono, Deno, Go, etc.). Follow the same patterns as the existing examples: timeout handling, error recovery, parallel calls.

**Checklists** — New checklists or improvements to existing ones. Every item should be specific and actionable — "test your agent" is not helpful, "make 5+ test calls and review transcripts for unnatural phrasing" is.

**Documentation** — Corrections, clarifications, or new guides. If you hit a problem that took you hours to debug and the answer wasn't in our docs, write it up.

**Integration Examples** — Code for connecting agents to popular services (Zapier, Make, n8n, Salesforce, HubSpot, etc.).

## How to Contribute

1. Fork the repository
2. Create a branch (`git checkout -b add-flask-webhook`)
3. Make your changes
4. Test your changes (if code, make sure it runs)
5. Submit a pull request

## Guidelines

- **Write from experience.** Theoretical advice is less valuable than battle-tested patterns.
- **Keep it concise.** Respect the reader's time. Say it once, say it clearly.
- **Include context.** Don't just say what — explain why. "Set stability to 0.4" is good. "Set stability to 0.4 because the default 0.7 sounds robotic in conversation" is better.
- **Test your code.** Every code example should run without modification (given the right environment variables).
- **No placeholder content.** If a template prompt says "Your company does X", replace X with something realistic that demonstrates the pattern.

## Style

- Markdown files: ATX headings (`#`), no trailing whitespace, one blank line between sections
- Code: follow the conventions of the existing examples in that language
- File names: lowercase, hyphens for spaces (`pre-call.ts`, not `PreCall.ts`)

## Questions?

Open an issue. We'll respond.
