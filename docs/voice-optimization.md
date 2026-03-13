# Voice Optimization

This guide covers TTS model selection, voice settings, turn detection, ASR tuning, and latency optimization for ElevenLabs voice agents.

## TTS Model Selection

The TTS model is one of the highest-impact decisions for your agent. It determines synthesis latency, voice quality, and language support.

| Model | ID | Latency | Languages | Best For |
|-------|----|---------|-----------|----------|
| Flash v2 | `eleven_flash_v2` | ~75ms | English only | English agents where speed matters |
| Turbo v2 | `eleven_turbo_v2` | ~100ms | English only | English agents needing slightly richer voice |
| Flash v2.5 | `eleven_flash_v2_5` | ~90ms | 32 languages | Multilingual agents |
| Multilingual v2 | `eleven_multilingual_v2` | ~150ms | 29 languages | Highest quality multilingual |

### Decision tree

1. **Is your agent English-only?**
   - Yes → Use `eleven_flash_v2`. Fall back to `eleven_turbo_v2` if the voice sounds off with flash.
   - No → Use `eleven_flash_v2_5`. Fall back to `eleven_multilingual_v2` for quality-critical applications.

2. **Hard rule**: English-only agents **must** use `eleven_flash_v2` or `eleven_turbo_v2`. The API will reject `eleven_flash_v2_5` or `eleven_multilingual_v2` for English-only configurations.

### Why not always use Flash v2.5?

Flash v2.5 supports English, but it's optimized for multilingual use. For English-only agents, `eleven_flash_v2` produces more natural prosody and lower latency. Don't pay the multilingual overhead when you don't need it.

## Voice Settings

Three parameters control how the synthesized voice sounds:

### Stability (0.0 - 1.0)

Controls how consistent the voice sounds across turns.

| Range | Effect | Use Case |
|-------|--------|----------|
| 0.0 - 0.2 | Highly expressive, sometimes unpredictable | Creative/entertainment agents |
| **0.3 - 0.5** | **Natural variation, sounds conversational** | **Most agents** |
| 0.6 - 0.8 | Consistent, slightly flat | Professional/formal agents |
| 0.9 - 1.0 | Very stable, can sound robotic | Announcements, IVR menus |

**Default recommendation**: `0.4`. This sounds like a person who's consistent but not monotone.

If your agent sounds robotic, the first thing to try is lowering stability to 0.3-0.4.

### Similarity Boost (0.0 - 1.0)

Controls how closely the output matches the original voice. Higher values produce more accurate voice clones but can amplify artifacts.

| Range | Effect |
|-------|--------|
| 0.0 - 0.3 | Loose resemblance, fewer artifacts |
| **0.5 - 0.7** | **Good balance for most voices** |
| 0.8 - 1.0 | Very close match, may introduce artifacts |

**Default recommendation**: `0.6`. Increase if the voice doesn't sound enough like the source. Decrease if you hear audio artifacts.

### Speed (0.5 - 2.0)

Multiplier for speech rate.

| Range | Effect |
|-------|--------|
| 0.5 - 0.8 | Slow, deliberate speech |
| 0.9 - 1.0 | Natural pace |
| **1.0 - 1.1** | **Slightly faster, sounds confident** |
| 1.2+ | Noticeably fast, can reduce clarity |

**Default recommendation**: `1.0` to `1.05`. A very slight speed increase (1.05) can make the agent sound more natural and responsive without being noticeably fast. Avoid going above 1.1 unless the use case demands it.

## Turn Detection Settings

Turn detection determines when the agent decides the caller has finished speaking and it should respond. This is controlled by the **eagerness** setting.

### Eagerness Levels

| Level | Behavior | Use Case |
|-------|----------|----------|
| Very Low (1) | Waits a long time before responding | Legal/medical agents where interrupting is unacceptable |
| Low (2) | Patient, lets caller finish completely | Complex topics, elderly callers |
| **Medium (3)** | **Balanced, natural conversation pace** | **Most agents** |
| High (4) | Responds quickly, may clip trailing words | Fast-paced interactions, simple Q&A |
| Very High (5) | Very responsive, will interrupt pauses | Not recommended for most use cases |

**Default recommendation**: Start at **Medium (3)**. Adjust based on test calls.

### When to adjust

- **Agent interrupts the caller**: Lower the eagerness. The agent is interpreting mid-sentence pauses as turn boundaries.
- **Agent waits too long to respond**: Raise the eagerness. The caller is done speaking but the agent doesn't realize it.
- **Agent and caller keep talking over each other**: Lower eagerness and add a prompt instruction: "Wait for the caller to fully finish speaking before responding."

### Turn detection and silence

If the caller goes silent for an extended period (10+ seconds), the agent should handle it. Add a prompt instruction:

```
If the caller goes silent for more than a few seconds, gently check in:
"Are you still there?" or "Take your time, I'm here when you're ready."
```

## ASR (Speech Recognition) Keywords

ASR keywords boost the speech recognition model's accuracy for specific terms that it might otherwise misrecognize.

### Format

```
word_or_phrase:weight
```

Weight ranges from 1 (slight boost) to 5 (strong boost). Higher weights make the recognizer heavily favor that term.

### When to use keywords

- **Brand names**: `Acme Corp:3`, `TechFlow:4`
- **Product names**: `ProMax 5000:3`, `FlexiPlan:4`
- **Industry terms**: `HIPAA:3`, `SOC2:2`
- **Proper nouns**: `Dr. Martinez:3`
- **Acronyms**: `API:2`, `CRM:2`, `SLA:3`
- **Codes/IDs**: Only if callers regularly say them aloud

### Best practices

- Start with weight 2-3. Only use 4-5 if the recognizer consistently misses the term.
- Don't add common English words — they don't need boosting and can skew recognition.
- Test with actual calls. Over-boosting can cause the recognizer to hallucinate the keyword when something similar is said.
- Keep the keyword list under 50 terms. Large lists can degrade overall recognition quality.

### Example keyword set for a SaaS support agent

```
TechFlow:4
ProMax:3
FlexiPlan:3
Enterprise Tier:2
API:2
webhook:2
SSO:3
two-factor:2
```

## Filler Words and Backchanneling

Filler words (`um`, `uh`, `like`) and backchanneling (`mmhm`, `right`, `I see`) make agents sound more human.

### Enabling fillers

In the agent config, you can enable automatic filler injection. The TTS model will add natural-sounding fillers at appropriate points.

### Backchanneling

Backchanneling means the agent makes small acknowledgment sounds while the caller is speaking (like how humans say "mmhm" or "right" during a conversation).

When enabled, the agent will produce brief audio acknowledgments during the caller's turn, signaling active listening.

### When to use

- **Enable fillers** for conversational agents (support, sales, reception). Disable for professional/formal agents (legal, medical, financial).
- **Enable backchanneling** for long-form conversations where the caller speaks for extended periods. Disable for short, transactional calls.

## Latency Optimization Checklist

Run through this checklist when your agent feels slow:

### TTS
- [ ] Using `eleven_flash_v2` for English-only agents?
- [ ] Not using `eleven_multilingual_v2` unless you actually need multilingual support?

### LLM
- [ ] Using an appropriate model? (Gemini Flash for simple agents, GPT-4o for complex ones)
- [ ] Prompt under 15K characters?
- [ ] Critical instructions front-loaded in the prompt?

### Tools
- [ ] Tool webhooks respond within 1-2 seconds?
- [ ] Using `Promise.all()` for parallel API calls in tool handlers?
- [ ] Caching frequent lookups?
- [ ] Hard timeout (`AbortController` + `setTimeout`) on all external API calls?
- [ ] Tool response payloads are concise (not returning unnecessary data)?

### Pre-call Webhook
- [ ] Responds within 3 seconds (5s hard limit)?
- [ ] External API calls run in parallel?
- [ ] Has a fallback response if any lookup fails?
- [ ] Uses caching for repeated callers?

### Network
- [ ] Webhook servers deployed in the same region as your ElevenLabs config?
- [ ] Using a fast hosting provider (Vercel Edge, Cloudflare Workers, etc.)?

### Prompt
- [ ] Avoiding instructions that cause long responses?
- [ ] Agent keeps responses to 1-3 sentences per turn?

## Voice Cloning Considerations

If you're using a custom cloned voice instead of a library voice:

### Quality tips

- **Source audio**: Use clean, studio-quality recordings. Background noise degrades clone quality.
- **Duration**: Professional voice clones (PVC) need 30+ minutes of clean audio. Instant voice clones work with as little as 30 seconds but produce lower quality.
- **Consistency**: Source audio should be consistent in tone and style. Don't mix excited narration with calm conversation.
- **Test across content types**: A voice cloned from narration may sound odd in conversation. Test with realistic dialogue.

### Legal considerations

- Ensure you have rights to clone the voice (consent from the voice owner)
- ElevenLabs requires verification for professional voice clones
- Some jurisdictions have laws around synthetic voice usage — check your local regulations

### Settings for cloned voices

Cloned voices sometimes need different settings than library voices:

- **Similarity boost**: Start at 0.7 and adjust. Too high introduces artifacts; too low loses the voice's character.
- **Stability**: Cloned voices may need slightly higher stability (0.4-0.6) to stay consistent.
- **Test extensively**: Cloned voices can behave differently across TTS models. Test your clone with both Flash v2 and Turbo v2 to see which sounds better.
