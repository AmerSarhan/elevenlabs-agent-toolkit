import { Request, Response, Router } from "express";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CrmContact {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  company: string;
  account_status: "active" | "churned" | "trial" | "prospect";
  lifetime_value: number;
  last_interaction: string;
  notes: string;
}

interface ElevenLabsConversation {
  conversation_id: string;
  agent_id: string;
  status: string;
  metadata: Record<string, string>;
  analysis?: {
    call_successful?: string;
    transcript_summary?: string;
  };
  start_time_unix_secs: number;
}

interface ConversationListResponse {
  conversations: ElevenLabsConversation[];
  has_more: boolean;
}

interface PreCallWebhookPayload {
  type: "pre_call";
  event: {
    call_sid: string;
    caller_id: string;
    called_number: string;
    call_type: "phone" | "web";
    agent_id: string;
  };
}

interface PreCallWebhookResponse {
  dynamic_variables?: Record<string, string>;
  conversation_config_override?: {
    agent?: {
      first_message?: string;
      prompt?: {
        prompt?: string;
      };
    };
  };
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const CRM_API_KEY = process.env.CRM_API_KEY!;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY!;
const ELEVENLABS_AGENT_ID = process.env.ELEVENLABS_AGENT_ID!;

const CRM_BASE_URL = process.env.CRM_BASE_URL ?? "https://api.yourcrm.com/v1";
const ELEVENLABS_BASE_URL = "https://api.elevenlabs.io/v1";

const REQUEST_TIMEOUT_MS = 3_500;
const HANDLER_TIMEOUT_MS = 4_500;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timedFetch(
  url: string,
  init: RequestInit & { timeout?: number } = {},
): Promise<globalThis.Response> {
  const controller = new AbortController();
  const timeout = init.timeout ?? REQUEST_TIMEOUT_MS;
  const timer = setTimeout(() => controller.abort(), timeout);

  return fetch(url, {
    ...init,
    signal: controller.signal,
  }).finally(() => clearTimeout(timer));
}

async function lookupCrmContact(
  phoneNumber: string,
): Promise<CrmContact | null> {
  const res = await timedFetch(
    `${CRM_BASE_URL}/contacts/search?phone=${encodeURIComponent(phoneNumber)}`,
    {
      headers: {
        Authorization: `Bearer ${CRM_API_KEY}`,
        "Content-Type": "application/json",
      },
    },
  );

  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`CRM lookup failed: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as { contacts: CrmContact[] };
  return data.contacts.length > 0 ? data.contacts[0] : null;
}

async function getConversationHistory(
  callerId: string,
): Promise<ElevenLabsConversation[]> {
  const url = new URL(`${ELEVENLABS_BASE_URL}/convai/conversations`);
  url.searchParams.set("agent_id", ELEVENLABS_AGENT_ID);
  url.searchParams.set("page_size", "5");

  const res = await timedFetch(url.toString(), {
    headers: {
      "xi-api-key": ELEVENLABS_API_KEY,
    },
  });

  if (!res.ok) {
    throw new Error(
      `ElevenLabs history fetch failed: ${res.status} ${res.statusText}`,
    );
  }

  const data = (await res.json()) as ConversationListResponse;
  return data.conversations.filter(
    (c) => c.metadata?.caller_id === callerId,
  );
}

function buildCallerContext(
  contact: CrmContact | null,
  history: ElevenLabsConversation[],
): string {
  const parts: string[] = [];

  if (contact) {
    parts.push(
      `Caller: ${contact.first_name} ${contact.last_name}`,
      `Company: ${contact.company}`,
      `Account status: ${contact.account_status}`,
    );
    if (contact.notes) {
      parts.push(`CRM notes: ${contact.notes}`);
    }
  }

  if (history.length > 0) {
    parts.push(`Previous calls: ${history.length}`);
    const lastCall = history[0];
    if (lastCall.analysis?.transcript_summary) {
      parts.push(`Last call summary: ${lastCall.analysis.transcript_summary}`);
    }
    const lastDate = new Date(
      lastCall.start_time_unix_secs * 1000,
    ).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    parts.push(`Last call date: ${lastDate}`);
  }

  return parts.length > 0
    ? parts.join("\n")
    : "No prior contact information available.";
}

function buildFirstMessage(contact: CrmContact | null): string {
  if (contact) {
    return `Hi ${contact.first_name}, thanks for calling! How can I help you today?`;
  }
  return "Thanks for calling! How can I help you today?";
}

function fallbackResponse(): PreCallWebhookResponse {
  return {
    dynamic_variables: {
      caller_context: "No prior contact information available.",
      caller_name: "Unknown",
      account_status: "unknown",
      previous_call_count: "0",
    },
  };
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const router = Router();

router.post(
  "/webhooks/elevenlabs/pre-call",
  async (req: Request, res: Response): Promise<void> => {
    const run = async (): Promise<PreCallWebhookResponse> => {
      const payload = req.body as PreCallWebhookPayload;
      const { caller_id: callerId } = payload.event;

      const [contactResult, historyResult] = await Promise.allSettled([
        lookupCrmContact(callerId),
        getConversationHistory(callerId),
      ]);

      const contact =
        contactResult.status === "fulfilled" ? contactResult.value : null;
      const history =
        historyResult.status === "fulfilled" ? historyResult.value : [];

      if (contactResult.status === "rejected") {
        console.error("CRM lookup failed:", contactResult.reason);
      }
      if (historyResult.status === "rejected") {
        console.error("History fetch failed:", historyResult.reason);
      }

      const callerContext = buildCallerContext(contact, history);
      const firstMessage = buildFirstMessage(contact);

      return {
        dynamic_variables: {
          caller_context: callerContext,
          caller_name: contact
            ? `${contact.first_name} ${contact.last_name}`
            : "Unknown",
          account_status: contact?.account_status ?? "unknown",
          previous_call_count: String(history.length),
        },
        conversation_config_override: {
          agent: {
            first_message: firstMessage,
          },
        },
      };
    };

    const hardTimeout = new Promise<PreCallWebhookResponse>((resolve) => {
      setTimeout(() => {
        console.warn("Pre-call webhook hit hard timeout, returning fallback");
        resolve(fallbackResponse());
      }, HANDLER_TIMEOUT_MS);
    });

    try {
      const response = await Promise.race([run(), hardTimeout]);
      res.json(response);
    } catch (error) {
      console.error("Unhandled error in pre-call webhook:", error);
      res.json(fallbackResponse());
    }
  },
);

export default router;
