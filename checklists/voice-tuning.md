# Voice Tuning Checklist

Use when dialing in voice settings for natural conversation.

## Voice Selection

- [ ] Tested 3+ voices with your actual prompt
- [ ] Voice matches brand personality (professional, friendly, authoritative)
- [ ] Voice gender/age matches use case expectations
- [ ] Voice sounds good on phone (not just speakers)

## Stability

- [ ] Tested stability at 0.3, 0.4, and 0.5
- [ ] Lower stability (0.3) for expressive/friendly agents
- [ ] Higher stability (0.5) for professional/formal agents
- [ ] Default 0.7+ avoided (sounds robotic in conversation)

## Speed

- [ ] Tested speed at 1.0 and 1.05
- [ ] Not exceeding 1.1 (sounds unnatural)
- [ ] Speed matches agent personality

## TTS Model

- [ ] English-only: using eleven_flash_v2 or eleven_turbo_v2
- [ ] Multilingual: using eleven_flash_v2_5 or eleven_multilingual_v2
- [ ] Latency tested and acceptable

## Turn Detection

- [ ] Eagerness matches use case
- [ ] Agent doesn't interrupt callers mid-sentence
- [ ] Agent responds promptly when caller finishes
- [ ] Tested with callers who pause to think

## ASR Keywords

- [ ] Company/product names added with high weight (e.g., CompanyName:2)
- [ ] Industry terms added
- [ ] Common misspellings/pronunciations accounted for
- [ ] Not exceeding 100 keywords (diminishing returns)

## Phone Quality

- [ ] Tested on actual phone call (not just browser)
- [ ] Audio is clear and not distorted
- [ ] No echo or feedback issues
- [ ] Background noise handled appropriately
