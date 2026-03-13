# Scaling Checklist

Preparing for high call volumes (100+ calls/day).

## Webhook Performance

- [ ] Pre-call webhook P95 latency under 3 seconds
- [ ] All external API calls have timeouts (3-4 seconds max)
- [ ] Parallel API calls where possible (Promise.all)
- [ ] Hard timeout with Promise.race to guarantee response
- [ ] Graceful degradation: return basic response if lookups fail

## Data Architecture

- [ ] Conversation lookups filter by caller_id (not global scan)
- [ ] Database queries are indexed
- [ ] Caching layer for frequently accessed data
- [ ] Connection pooling for database connections

## Infrastructure

- [ ] Webhook hosted on auto-scaling infrastructure (Vercel, AWS Lambda, Cloud Run)
- [ ] No single points of failure
- [ ] CDN/edge deployment for webhook endpoints
- [ ] Health check endpoint for monitoring

## Monitoring

- [ ] Dashboard for call volume, success rate, latency
- [ ] Alerting on webhook errors (>1% error rate)
- [ ] Alerting on latency spikes (P95 > 4s)
- [ ] Daily transcript review for quality regression

## Cost Management

- [ ] LLM model cost per call calculated
- [ ] TTS cost per call calculated
- [ ] Telephony cost per minute understood
- [ ] Budget alerts configured
- [ ] Cheaper model evaluated for simple use cases

## Reliability

- [ ] Webhook returns valid response even when all lookups fail
- [ ] Agent works without pre-call webhook (fallback first message)
- [ ] Post-call webhook failures don't affect caller experience
- [ ] Tested behavior under simulated API failures
