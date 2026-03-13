#!/usr/bin/env bash
#
# Test your pre-call and post-call webhooks locally.
#
# Usage:
#   ./scripts/test-webhook.sh pre-call http://localhost:3000/api/agent/pre-call
#   ./scripts/test-webhook.sh post-call http://localhost:3000/api/agent/post-call
#   ./scripts/test-webhook.sh pre-call http://localhost:3000/api/agent/pre-call +447700900000

set -euo pipefail

WEBHOOK_TYPE="${1:-}"
WEBHOOK_URL="${2:-}"
CALLER_ID="${3:-+15551234567}"

if [[ -z "$WEBHOOK_TYPE" || -z "$WEBHOOK_URL" ]]; then
  echo "Usage: $0 <pre-call|post-call> <webhook-url> [caller-id]"
  echo ""
  echo "Examples:"
  echo "  $0 pre-call http://localhost:3000/api/agent/pre-call"
  echo "  $0 post-call http://localhost:3000/api/agent/post-call"
  echo "  $0 pre-call http://localhost:3000/api/agent/pre-call +447700900000"
  exit 1
fi

if [[ "$WEBHOOK_TYPE" == "pre-call" ]]; then
  echo "Testing pre-call webhook: $WEBHOOK_URL"
  echo "Caller ID: $CALLER_ID"
  echo "---"

  START=$(date +%s%N)

  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$WEBHOOK_URL" \
    -H "Content-Type: application/json" \
    -d "{
      \"call_sid\": \"test_$(date +%s)\",
      \"caller_id\": \"$CALLER_ID\",
      \"called_number\": \"+15559876543\",
      \"call_type\": \"phone_call\",
      \"agent_id\": \"test_agent\"
    }")

  END=$(date +%s%N)
  ELAPSED=$(( (END - START) / 1000000 ))

  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  BODY=$(echo "$RESPONSE" | sed '$d')

  echo "Status: $HTTP_CODE"
  echo "Time: ${ELAPSED}ms"
  echo ""

  if [[ $ELAPSED -gt 5000 ]]; then
    echo "WARNING: Response took ${ELAPSED}ms — exceeds ElevenLabs 5s timeout!"
  elif [[ $ELAPSED -gt 4000 ]]; then
    echo "WARNING: Response took ${ELAPSED}ms — cutting it close to 5s limit."
  else
    echo "OK: Response time is within limits."
  fi

  echo ""
  echo "Response:"
  echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"

elif [[ "$WEBHOOK_TYPE" == "post-call" ]]; then
  echo "Testing post-call webhook: $WEBHOOK_URL"
  echo "---"

  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$WEBHOOK_URL" \
    -H "Content-Type: application/json" \
    -d "{
      \"conversation_id\": \"test_conv_$(date +%s)\",
      \"agent_id\": \"test_agent\",
      \"caller_id\": \"$CALLER_ID\",
      \"call_duration_secs\": 180,
      \"status\": \"completed\",
      \"transcript\": [
        {\"role\": \"agent\", \"message\": \"Hey there, how can I help?\", \"time_in_call_secs\": 0},
        {\"role\": \"user\", \"message\": \"Hi, I'm looking for plumbing work in London.\", \"time_in_call_secs\": 2},
        {\"role\": \"agent\", \"message\": \"I can help with that. Let me check what we have available.\", \"time_in_call_secs\": 5}
      ],
      \"analysis\": {
        \"transcript_summary\": \"Caller inquired about plumbing positions in London.\",
        \"call_successful\": \"true\",
        \"data_collection_results\": {
          \"caller_name\": {\"value\": \"Test User\"},
          \"call_type\": {\"value\": \"new_inquiry\"}
        }
      }
    }")

  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  BODY=$(echo "$RESPONSE" | sed '$d')

  echo "Status: $HTTP_CODE"
  echo ""
  echo "Response:"
  echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"

else
  echo "Unknown webhook type: $WEBHOOK_TYPE"
  echo "Use 'pre-call' or 'post-call'"
  exit 1
fi
