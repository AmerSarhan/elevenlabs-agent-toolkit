import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ActionItem {
  description: string;
  assignee?: string;
  due_date?: string;
  priority?: "low" | "medium" | "high";
}

interface CallLogRequest {
  conversation_id: string;
  caller_phone?: string;
  caller_name?: string;
  call_type: string;
  call_outcome: string;
  summary: string;
  notes?: string;
  action_items?: ActionItem[];
  tags?: string[];
  metadata?: Record<string, string>;
}

interface CallLogRecord {
  id: string;
  conversation_id: string;
  caller_phone: string | null;
  caller_name: string | null;
  call_type: string;
  call_outcome: string;
  summary: string;
  notes: string | null;
  action_items: ActionItem[];
  tags: string[];
  metadata: Record<string, string>;
  created_at: string;
}

interface ToolResponse {
  logged: boolean;
  summary: string;
  record_id?: string;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const DATABASE_URL = process.env.DATABASE_URL!;

// ---------------------------------------------------------------------------
// Database
// ---------------------------------------------------------------------------

async function insertCallLog(record: CallLogRecord): Promise<string> {
  // Using the postgres package — swap with Prisma, Drizzle, Knex, etc.
  const { default: postgres } = await import("postgres");
  const sql = postgres(DATABASE_URL, { max: 1, idle_timeout: 5 });

  try {
    const [row] = await sql`
      INSERT INTO call_logs (
        id,
        conversation_id,
        caller_phone,
        caller_name,
        call_type,
        call_outcome,
        summary,
        notes,
        action_items,
        tags,
        metadata,
        created_at
      ) VALUES (
        ${record.id},
        ${record.conversation_id},
        ${record.caller_phone},
        ${record.caller_name},
        ${record.call_type},
        ${record.call_outcome},
        ${record.summary},
        ${record.notes},
        ${JSON.stringify(record.action_items)}::jsonb,
        ${JSON.stringify(record.tags)}::jsonb,
        ${JSON.stringify(record.metadata)}::jsonb,
        ${record.created_at}
      )
      RETURNING id
    `;
    return row.id as string;
  } finally {
    await sql.end();
  }
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const VALID_OUTCOMES = [
  "resolved",
  "follow_up_needed",
  "escalated",
  "voicemail",
  "dropped",
  "transferred",
] as const;

function validateRequest(body: CallLogRequest): string | null {
  if (!body.conversation_id) return "conversation_id is required.";
  if (!body.call_type) return "call_type is required.";
  if (!body.call_outcome) return "call_outcome is required.";
  if (!body.summary) return "summary is required.";

  if (
    !VALID_OUTCOMES.includes(body.call_outcome as (typeof VALID_OUTCOMES)[number])
  ) {
    return `call_outcome must be one of: ${VALID_OUTCOMES.join(", ")}.`;
  }

  if (body.action_items) {
    for (let i = 0; i < body.action_items.length; i++) {
      if (!body.action_items[i].description) {
        return `action_items[${i}].description is required.`;
      }
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Route handler — POST /api/tools/database-logger
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: CallLogRequest;
  try {
    body = (await request.json()) as CallLogRequest;
  } catch {
    return NextResponse.json(
      { logged: false, summary: "Invalid request body." } satisfies ToolResponse,
      { status: 400 },
    );
  }

  const validationError = validateRequest(body);
  if (validationError) {
    return NextResponse.json(
      { logged: false, summary: validationError } satisfies ToolResponse,
      { status: 400 },
    );
  }

  const recordId = crypto.randomUUID();
  const now = new Date().toISOString();

  const record: CallLogRecord = {
    id: recordId,
    conversation_id: body.conversation_id,
    caller_phone: body.caller_phone ?? null,
    caller_name: body.caller_name ?? null,
    call_type: body.call_type,
    call_outcome: body.call_outcome,
    summary: body.summary,
    notes: body.notes ?? null,
    action_items: body.action_items ?? [],
    tags: body.tags ?? [],
    metadata: body.metadata ?? {},
    created_at: now,
  };

  try {
    const id = await insertCallLog(record);

    const actionCount = record.action_items.length;
    const actionSuffix =
      actionCount > 0
        ? ` with ${actionCount} action item${actionCount === 1 ? "" : "s"}`
        : "";

    return NextResponse.json({
      logged: true,
      record_id: id,
      summary: `Call log saved successfully${actionSuffix}. Record ID: ${id}.`,
    } satisfies ToolResponse);
  } catch (error) {
    console.error("Database insert failed:", error);
    return NextResponse.json(
      {
        logged: false,
        summary:
          "I wasn't able to save the call log right now. The call details may need to be recorded manually.",
      } satisfies ToolResponse,
      { status: 500 },
    );
  }
}
