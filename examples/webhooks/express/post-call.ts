import { Request, Response, Router } from "express";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DataCollectionField {
  name: string;
  value: string;
  description?: string;
}

interface PostCallWebhookPayload {
  type: "post_call";
  event: {
    conversation_id: string;
    agent_id: string;
    call_sid?: string;
    caller_id?: string;
    call_duration_secs: number;
    status: "done" | "failed" | "busy" | "no-answer";
    call_cost?: {
      total_cost_usd: number;
    };
    metadata?: Record<string, string>;
    analysis?: {
      call_successful?: "true" | "false" | "unknown";
      transcript_summary?: string;
      data_collection_results?: Record<string, DataCollectionField>;
      evaluation_criteria_results?: Record<
        string,
        { result: string; rationale: string }
      >;
    };
  };
}

interface CallRecord {
  conversation_id: string;
  agent_id: string;
  caller_id: string | null;
  duration_secs: number;
  status: string;
  cost_usd: number | null;
  summary: string | null;
  call_successful: string | null;
  data_collection: Record<string, string>;
  metadata: Record<string, string>;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const DATABASE_URL = process.env.DATABASE_URL!;
const NOTIFICATION_WEBHOOK_URL = process.env.NOTIFICATION_WEBHOOK_URL;

// ---------------------------------------------------------------------------
// Database
// ---------------------------------------------------------------------------

async function insertCallRecord(record: CallRecord): Promise<void> {
  const { default: postgres } = await import("postgres");
  const sql = postgres(DATABASE_URL, { max: 1, idle_timeout: 5 });

  try {
    await sql`
      INSERT INTO call_logs (
        conversation_id, agent_id, caller_id, duration_secs, status,
        cost_usd, summary, call_successful, data_collection, metadata, created_at
      ) VALUES (
        ${record.conversation_id}, ${record.agent_id}, ${record.caller_id},
        ${record.duration_secs}, ${record.status}, ${record.cost_usd},
        ${record.summary}, ${record.call_successful},
        ${JSON.stringify(record.data_collection)},
        ${JSON.stringify(record.metadata)}, ${record.created_at}
      )
    `;
  } finally {
    await sql.end();
  }
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

function shouldNotify(payload: PostCallWebhookPayload): {
  notify: boolean;
  reason: string;
} {
  const analysis = payload.event.analysis;

  if (analysis?.call_successful === "false") {
    return { notify: true, reason: "Call was unsuccessful" };
  }

  const evaluations = analysis?.evaluation_criteria_results ?? {};
  for (const [criterion, result] of Object.entries(evaluations)) {
    if (
      criterion.toLowerCase().includes("escalat") &&
      result.result === "true"
    ) {
      return { notify: true, reason: `Escalation detected: ${criterion}` };
    }
    if (
      criterion.toLowerCase().includes("sentiment") &&
      result.result === "negative"
    ) {
      return {
        notify: true,
        reason: `Negative sentiment: ${result.rationale}`,
      };
    }
  }

  if (payload.event.call_duration_secs > 600) {
    return {
      notify: true,
      reason: `Extended call duration: ${Math.round(payload.event.call_duration_secs / 60)} minutes`,
    };
  }

  return { notify: false, reason: "" };
}

async function sendNotification(
  payload: PostCallWebhookPayload,
  reason: string,
): Promise<void> {
  if (!NOTIFICATION_WEBHOOK_URL) {
    console.warn("NOTIFICATION_WEBHOOK_URL not set, skipping:", reason);
    return;
  }

  const event = payload.event;
  const summary =
    event.analysis?.transcript_summary ?? "No summary available.";
  const durationMin = Math.round(event.call_duration_secs / 60);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5_000);

  try {
    const res = await fetch(NOTIFICATION_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channel: "#call-alerts",
        text: `Call alert: ${reason}`,
        blocks: [
          {
            type: "header",
            text: { type: "plain_text", text: `Call Alert: ${reason}` },
          },
          {
            type: "section",
            fields: [
              {
                type: "mrkdwn",
                text: `*Conversation:*\n${event.conversation_id}`,
              },
              {
                type: "mrkdwn",
                text: `*Caller:*\n${event.caller_id ?? "Unknown"}`,
              },
              { type: "mrkdwn", text: `*Duration:*\n${durationMin} min` },
              { type: "mrkdwn", text: `*Status:*\n${event.status}` },
            ],
          },
          {
            type: "section",
            text: { type: "mrkdwn", text: `*Summary:*\n${summary}` },
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      console.error(`Notification failed: ${res.status} ${res.statusText}`);
    }
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractDataCollection(
  results?: Record<string, DataCollectionField>,
): Record<string, string> {
  if (!results) return {};
  const out: Record<string, string> = {};
  for (const [key, field] of Object.entries(results)) {
    if (field.value) out[key] = field.value;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const router = Router();

router.post(
  "/webhooks/elevenlabs/post-call",
  async (req: Request, res: Response): Promise<void> => {
    const payload = req.body as PostCallWebhookPayload;

    if (payload.type !== "post_call") {
      res.status(422).json({ error: `Unexpected type: ${payload.type}` });
      return;
    }

    const event = payload.event;

    const record: CallRecord = {
      conversation_id: event.conversation_id,
      agent_id: event.agent_id,
      caller_id: event.caller_id ?? null,
      duration_secs: event.call_duration_secs,
      status: event.status,
      cost_usd: event.call_cost?.total_cost_usd ?? null,
      summary: event.analysis?.transcript_summary ?? null,
      call_successful: event.analysis?.call_successful ?? null,
      data_collection: extractDataCollection(
        event.analysis?.data_collection_results,
      ),
      metadata: event.metadata ?? {},
      created_at: new Date().toISOString(),
    };

    const [dbResult, notifyResult] = await Promise.allSettled([
      insertCallRecord(record),
      (async () => {
        const { notify, reason } = shouldNotify(payload);
        if (notify) await sendNotification(payload, reason);
      })(),
    ]);

    if (dbResult.status === "rejected") {
      console.error("Failed to insert call record:", dbResult.reason);
      res.status(500).json({ error: "Failed to persist call data" });
      return;
    }

    if (notifyResult.status === "rejected") {
      console.error("Notification failed:", notifyResult.reason);
    }

    res.json({ status: "ok", conversation_id: event.conversation_id });
  },
);

export default router;
