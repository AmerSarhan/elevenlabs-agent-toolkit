"""
ElevenLabs post-call webhook — FastAPI implementation.

Receives conversation data after a call ends, persists it to a database,
and sends notifications for escalated or unsuccessful calls.
"""

from __future__ import annotations

import asyncio
import logging
import os
from datetime import datetime, timezone
from typing import Any

import httpx
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

DATABASE_URL: str = os.environ["DATABASE_URL"]
NOTIFICATION_WEBHOOK_URL: str | None = os.environ.get("NOTIFICATION_WEBHOOK_URL")

# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------


class DataCollectionField(BaseModel):
    name: str
    value: str
    description: str | None = None


class EvaluationResult(BaseModel):
    result: str
    rationale: str


class CallAnalysis(BaseModel):
    call_successful: str | None = None
    transcript_summary: str | None = None
    data_collection_results: dict[str, DataCollectionField] = Field(
        default_factory=dict
    )
    evaluation_criteria_results: dict[str, EvaluationResult] = Field(
        default_factory=dict
    )


class CallCost(BaseModel):
    total_cost_usd: float


class PostCallEvent(BaseModel):
    conversation_id: str
    agent_id: str
    call_sid: str | None = None
    caller_id: str | None = None
    call_duration_secs: float
    status: str  # done | failed | busy | no-answer
    call_cost: CallCost | None = None
    metadata: dict[str, str] = Field(default_factory=dict)
    analysis: CallAnalysis | None = None


class PostCallWebhookPayload(BaseModel):
    type: str
    event: PostCallEvent


# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------


async def insert_call_record(event: PostCallEvent) -> None:
    """Insert a call log row into the database.

    Uses asyncpg directly. Swap in SQLAlchemy, Tortoise, or any async ORM
    as needed.
    """
    import asyncpg  # type: ignore[import-untyped]

    data_collection = {
        k: v.value
        for k, v in (event.analysis.data_collection_results.items() if event.analysis else {})
        if v.value
    }

    conn: asyncpg.Connection = await asyncpg.connect(DATABASE_URL)
    try:
        await conn.execute(
            """
            INSERT INTO call_logs (
                conversation_id, agent_id, caller_id, duration_secs,
                status, cost_usd, summary, call_successful,
                data_collection, metadata, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb, $11)
            """,
            event.conversation_id,
            event.agent_id,
            event.caller_id,
            event.call_duration_secs,
            event.status,
            event.call_cost.total_cost_usd if event.call_cost else None,
            event.analysis.transcript_summary if event.analysis else None,
            event.analysis.call_successful if event.analysis else None,
            data_collection,
            event.metadata,
            datetime.now(timezone.utc).isoformat(),
        )
    finally:
        await conn.close()


# ---------------------------------------------------------------------------
# Notifications
# ---------------------------------------------------------------------------


def _should_notify(
    event: PostCallEvent,
) -> tuple[bool, str]:
    analysis = event.analysis

    if analysis and analysis.call_successful == "false":
        return True, "Call was unsuccessful"

    if analysis:
        for criterion, result in analysis.evaluation_criteria_results.items():
            if "escalat" in criterion.lower() and result.result == "true":
                return True, f"Escalation detected: {criterion}"
            if "sentiment" in criterion.lower() and result.result == "negative":
                return True, f"Negative sentiment: {result.rationale}"

    if event.call_duration_secs > 600:
        return (
            True,
            f"Extended call duration: {round(event.call_duration_secs / 60)} minutes",
        )

    return False, ""


async def send_notification(event: PostCallEvent, reason: str) -> None:
    if not NOTIFICATION_WEBHOOK_URL:
        logger.warning("NOTIFICATION_WEBHOOK_URL not set, skipping: %s", reason)
        return

    summary = (
        event.analysis.transcript_summary
        if event.analysis and event.analysis.transcript_summary
        else "No summary available."
    )
    duration_min = round(event.call_duration_secs / 60)

    payload = {
        "channel": "#call-alerts",
        "text": f"Call alert: {reason}",
        "blocks": [
            {
                "type": "header",
                "text": {"type": "plain_text", "text": f"Call Alert: {reason}"},
            },
            {
                "type": "section",
                "fields": [
                    {
                        "type": "mrkdwn",
                        "text": f"*Conversation:*\n{event.conversation_id}",
                    },
                    {
                        "type": "mrkdwn",
                        "text": f"*Caller:*\n{event.caller_id or 'Unknown'}",
                    },
                    {"type": "mrkdwn", "text": f"*Duration:*\n{duration_min} min"},
                    {"type": "mrkdwn", "text": f"*Status:*\n{event.status}"},
                ],
            },
            {
                "type": "section",
                "text": {"type": "mrkdwn", "text": f"*Summary:*\n{summary}"},
            },
        ],
    }

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            NOTIFICATION_WEBHOOK_URL,
            json=payload,
            timeout=5.0,
        )
        if resp.status_code >= 400:
            logger.error("Notification failed: %d %s", resp.status_code, resp.text)


# ---------------------------------------------------------------------------
# Router
# ---------------------------------------------------------------------------

router = APIRouter()


@router.post("/webhooks/elevenlabs/post-call")
async def post_call_webhook(request: Request) -> dict[str, str]:
    try:
        body = await request.json()
        payload = PostCallWebhookPayload(**body)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid payload: {exc}")

    if payload.type != "post_call":
        raise HTTPException(
            status_code=422,
            detail=f"Unexpected webhook type: {payload.type}",
        )

    event = payload.event

    # Run DB insert and notification concurrently.
    db_task = asyncio.create_task(insert_call_record(event))

    notify_task: asyncio.Task[None] | None = None
    should_notify, reason = _should_notify(event)
    if should_notify:
        notify_task = asyncio.create_task(send_notification(event, reason))

    results = await asyncio.gather(
        db_task,
        *([] if notify_task is None else [notify_task]),
        return_exceptions=True,
    )

    # The DB insert is at index 0.
    if isinstance(results[0], BaseException):
        logger.error("Failed to insert call record: %s", results[0])
        raise HTTPException(status_code=500, detail="Failed to persist call data")

    # Notification failure at index 1 (if present) is non-critical.
    if len(results) > 1 and isinstance(results[1], BaseException):
        logger.error("Notification failed: %s", results[1])

    return {"status": "ok", "conversation_id": event.conversation_id}
