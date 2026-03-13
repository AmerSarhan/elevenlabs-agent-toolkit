# Security Checklist

Hardening your agent against misuse.

## Prompt Security

- [ ] Agent refuses to reveal its system prompt
- [ ] Agent handles "ignore previous instructions" attacks
- [ ] Agent doesn't execute commands or code mentioned by callers
- [ ] Agent stays in character under pressure
- [ ] Tested with common prompt injection patterns

## Data Protection

- [ ] No API keys in client-side code
- [ ] Webhook endpoints validate requests (check headers, origin)
- [ ] Sensitive data not logged in plain text
- [ ] PII handling complies with applicable regulations (GDPR, CCPA)
- [ ] Call recordings stored securely (if enabled)

## Access Control

- [ ] ElevenLabs API key has minimum required permissions
- [ ] Webhook endpoints are not publicly listable
- [ ] Transfer numbers are allowlisted (agent can't call arbitrary numbers)
- [ ] Rate limiting on webhook endpoints

## Tool Security

- [ ] Tools validate all input parameters
- [ ] Tools don't expose internal system details in error messages
- [ ] Database queries use parameterized statements (no SQL injection)
- [ ] Tool responses don't include sensitive data the agent shouldn't share

## Monitoring

- [ ] Alerting on unusual call patterns (volume spikes, long calls)
- [ ] Logging webhook failures and errors
- [ ] Regular review of conversation transcripts for misuse
- [ ] Incident response plan for agent misuse
