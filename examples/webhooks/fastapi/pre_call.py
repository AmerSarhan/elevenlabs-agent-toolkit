"""
ElevenLabs pre-call webhook — FastAPI implementation.

Performs a CRM lookup and conversation history fetch before the call connects,
returning dynamic variables and a personalized first message.
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

CRM_API_KEY: str = os.environ["CRM_API_KEY"]
ELEVENLABS_API_KEY: str = os.environ["ELEVENLABS_API_KEY"]
ELEVENLABS_AGENT_ID: str = os.environ["ELEVENLABS_AGENT_ID"]

CRM_BASE_URL: str = os.environ.get("CRM_BASE_URL", "https://api.yourcrm.com/v1")
ELEVENLABS_BASE_URL: str = "https://api.elevenlabs.io/v1"

REQUEST_TIMEOUT_SECS: float = 3.5
HANDLER_TIMEOUT_SECS: float = 4.5

# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------


class CrmContact(BaseModel):
    id: str
    first_name: str
    last_name: str
    email: str
    company: str
    account_status: str  # active | churned | trial | prospect
    lifetime_value: float
    last_interaction: str
    notes: str = ""


class ConversationAnalysis(BaseModel):
    call_successful: str | None = None
    transcript_summary: str | None = None


class ElevenLabsConversation(BaseModel):
    conversation_id: str
    agent_id: str
    status: str
    metadata: dict[str, str] = Field(default_factory=dict)
    analysis: ConversationAnalysis | None = None
    start_time_unix_secs: int = 0


class PreCallEvent(BaseModel):
    call_sid: str
    caller_id: str
    called_number: str
    call_type: str  # phone | web
    agent_id: str


class PreCallWebhookPayload(BaseModel):
    type: str
    event: PreCallEvent


class AgentOverride(BaseModel):
    first_message: str | None = None


class ConversationConfigOverride(BaseModel):
    agent: AgentOverride | None = None


class PreCallWebhookResponse(BaseModel):
    dynamic_variables: dict[str, str] = Field(default_factory=dict)
    conversation_config_override: ConversationConfigOverride | None = None


# ---------------------------------------------------------------------------
# HTTP helpers
# ---------------------------------------------------------------------------


async def lookup_crm_contact(
    client: httpx.AsyncClient,
    phone_number: str,
) -> CrmContact | None:
    """Look up a contact by phone number in the CRM."""
    resp = await client.get(
        f"{CRM_BASE_URL}/contacts/search",
        params={"phone": phone_number},
        headers={
            "Authorization": f"Bearer {CRM_API_KEY}",
            "Content-Type": "application/json",
        },
        timeout=REQUEST_TIMEOUT_SECS,
    )
    if resp.status_code == 404:
        return None
    resp.raise_for_status()

    contacts = resp.json().get("contacts", [])
    return CrmContact(**contacts[0]) if contacts else None


async def get_conversation_history(
    client: httpx.AsyncClient,
    caller_id: str,
) -> list[ElevenLabsConversation]:
    """Fetch recent conversations for this agent and filter by caller."""
    resp = await client.get(
        f"{ELEVENLABS_BASE_URL}/convai/conversations",
        params={"agent_id": ELEVENLABS_AGENT_ID, "page_size": "5"},
        headers={"xi-api-key": ELEVENLABS_API_KEY},
        timeout=REQUEST_TIMEOUT_SECS,
    )
    resp.raise_for_status()

    conversations = [
        ElevenLabsConversation(**c)
        for c in resp.json().get("conversations", [])
    ]
    return [c for c in conversations if c.metadata.get("caller_id") == caller_id]


# ---------------------------------------------------------------------------
# Context builders
# ---------------------------------------------------------------------------


def build_caller_context(
    contact: CrmContact | None,
    history: list[ElevenLabsConversation],
) -> str:
    parts: list[str] = []

    if contact:
        parts.append(f"Caller: {contact.first_name} {contact.last_name}")
        parts.append(f"Company: {contact.company}")
        parts.append(f"Account status: {contact.account_status}")
        if contact.notes:
            parts.append(f"CRM notes: {contact.notes}")

    if history:
        parts.append(f"Previous calls: {len(history)}")
        last_call = history[0]
        if last_call.analysis and last_call.analysis.transcript_summary:
            parts.append(
                f"Last call summary: {last_call.analysis.transcript_summary}"
            )
        last_date = datetime.fromtimestamp(
            last_call.start_time_unix_secs, tz=timezone.utc
        ).strftime("%b %d, %Y")
        parts.append(f"Last call date: {last_date}")

    return "\n".join(parts) if parts else "No prior contact information available."


def build_first_message(contact: CrmContact | None) -> str:
    if contact:
        return (
            f"Hi {contact.first_name}, thanks for calling! "
            "How can I help you today?"
        )
    return "Thanks for calling! How can I help you today?"


def fallback_response() -> PreCallWebhookResponse:
    return PreCallWebhookResponse(
        dynamic_variables={
            "caller_context": "No prior contact information available.",
            "caller_name": "Unknown",
            "account_status": "unknown",
            "previous_call_count": "0",
        },
    )


# ---------------------------------------------------------------------------
# Router
# ---------------------------------------------------------------------------

router = APIRouter()


@router.post(
    "/webhooks/elevenlabs/pre-call",
    response_model=PreCallWebhookResponse,
)
async def pre_call_webhook(request: Request) -> PreCallWebhookResponse:
    try:
        body = await request.json()
        payload = PreCallWebhookPayload(**body)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid payload: {exc}")

    caller_id = payload.event.caller_id

    async def _run() -> PreCallWebhookResponse:
        async with httpx.AsyncClient() as client:
            crm_task = asyncio.create_task(
                lookup_crm_contact(client, caller_id)
            )
            history_task = asyncio.create_task(
                get_conversation_history(client, caller_id)
            )

            results = await asyncio.gather(
                crm_task, history_task, return_exceptions=True
            )

        contact: CrmContact | None = None
        history: list[ElevenLabsConversation] = []

        if isinstance(results[0], BaseException):
            logger.error("CRM lookup failed: %s", results[0])
        else:
            contact = results[0]

        if isinstance(results[1], BaseException):
            logger.error("History fetch failed: %s", results[1])
        else:
            history = results[1]

        caller_context = build_caller_context(contact, history)
        first_message = build_first_message(contact)

        return PreCallWebhookResponse(
            dynamic_variables={
                "caller_context": caller_context,
                "caller_name": (
                    f"{contact.first_name} {contact.last_name}"
                    if contact
                    else "Unknown"
                ),
                "account_status": contact.account_status if contact else "unknown",
                "previous_call_count": str(len(history)),
            },
            conversation_config_override=ConversationConfigOverride(
                agent=AgentOverride(first_message=first_message),
            ),
        )

    try:
        return await asyncio.wait_for(_run(), timeout=HANDLER_TIMEOUT_SECS)
    except asyncio.TimeoutError:
        logger.warning("Pre-call webhook hit hard timeout, returning fallback")
        return fallback_response()
    except Exception:
        logger.exception("Unhandled error in pre-call webhook")
        return fallback_response()
