# Pre-Launch Checklist

Everything to verify before your agent takes its first real call.

## Agent Configuration

- [ ] LLM model selected and tested (recommend gpt-4.1 or glm-45-air-fp8)
- [ ] TTS model matches language (flash_v2 for English-only)
- [ ] Voice selected and tested with real conversation samples
- [ ] Stability set between 0.3-0.5 (not default 0.7 which sounds robotic)
- [ ] Speed set between 1.0-1.1 (natural pace)
- [ ] Turn eagerness matches use case (eager for sales, patient for surveys)
- [ ] First message sounds natural when spoken aloud
- [ ] Agent language set correctly

## Prompt

- [ ] Prompt tested with 10+ different conversation scenarios
- [ ] Identity section defines name, company, role clearly
- [ ] Rules section covers edge cases (angry callers, off-topic, silence)
- [ ] No "text-only" phrases (bullet points, numbered lists, URLs)
- [ ] Dynamic variables referenced correctly ({{caller_name}} etc.)
- [ ] Prompt under 15K characters
- [ ] Tested with adversarial inputs (prompt injection, inappropriate requests)

## Tools

- [ ] All webhook tools responding under 3 seconds
- [ ] Tool descriptions are clear (LLM reads these to decide when to call)
- [ ] Error responses from tools are handled gracefully
- [ ] Tools tested with missing/malformed parameters
- [ ] Transfer numbers verified and tested

## Webhooks

- [ ] Pre-call webhook responds under 5 seconds (hard ElevenLabs limit)
- [ ] Pre-call webhook returns valid response even on error
- [ ] Post-call webhook processes data correctly
- [ ] Webhook URLs are HTTPS
- [ ] Webhook authentication configured

## Data Collection

- [ ] All fields have clear descriptions
- [ ] Field types match expected data (string, boolean, enum)
- [ ] Required vs optional fields make sense
- [ ] Tested that fields populate from real conversations

## Evaluation Criteria

- [ ] At least 2-3 criteria defined
- [ ] Criteria are specific and measurable
- [ ] conversation_goal_prompt field used (not description)

## Infrastructure

- [ ] Webhook hosting is reliable (not a dev machine)
- [ ] Environment variables set in production
- [ ] Monitoring/alerting configured for webhook failures
- [ ] Logs are being captured
- [ ] Rate limits understood and accounted for

## Final Verification

- [ ] Made 5+ test calls end-to-end
- [ ] Tested with different phone numbers
- [ ] Tested returning caller flow
- [ ] Tested edge cases (hang up immediately, silence, background noise)
- [ ] Reviewed 3+ call transcripts for quality
