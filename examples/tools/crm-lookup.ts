import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CrmContact {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  company: string;
  role: string;
  account_status: "active" | "churned" | "trial" | "prospect";
  plan: string;
  lifetime_value: number;
  created_at: string;
  last_interaction: string;
}

interface Interaction {
  id: string;
  type: "call" | "email" | "meeting" | "ticket";
  summary: string;
  date: string;
  outcome: string;
}

interface CrmLookupResult {
  contact: CrmContact;
  recent_interactions: Interaction[];
}

interface ToolResponse {
  contact_found: boolean;
  summary: string;
  details?: {
    name: string;
    company: string;
    role: string;
    account_status: string;
    plan: string;
    recent_activity: string;
  };
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const CRM_API_KEY = process.env.CRM_API_KEY!;
const CRM_BASE_URL = process.env.CRM_BASE_URL ?? "https://api.yourcrm.com/v1";
const REQUEST_TIMEOUT_MS = 5_000;

// ---------------------------------------------------------------------------
// CRM client
// ---------------------------------------------------------------------------

function timedFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  return fetch(url, {
    ...init,
    signal: controller.signal,
    headers: {
      Authorization: `Bearer ${CRM_API_KEY}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  }).finally(() => clearTimeout(timer));
}

async function searchByPhone(phone: string): Promise<CrmLookupResult | null> {
  const res = await timedFetch(
    `${CRM_BASE_URL}/contacts/search?phone=${encodeURIComponent(phone)}&include=interactions`,
  );

  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`CRM search failed: ${res.status}`);
  }

  const data = (await res.json()) as {
    contacts: CrmContact[];
    interactions: Interaction[];
  };

  if (data.contacts.length === 0) return null;
  return {
    contact: data.contacts[0],
    recent_interactions: data.interactions.slice(0, 5),
  };
}

async function searchByName(name: string): Promise<CrmLookupResult | null> {
  const res = await timedFetch(
    `${CRM_BASE_URL}/contacts/search?name=${encodeURIComponent(name)}&include=interactions`,
  );

  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`CRM search failed: ${res.status}`);
  }

  const data = (await res.json()) as {
    contacts: CrmContact[];
    interactions: Interaction[];
  };

  if (data.contacts.length === 0) return null;
  return {
    contact: data.contacts[0],
    recent_interactions: data.interactions.slice(0, 5),
  };
}

// ---------------------------------------------------------------------------
// Response formatting — keep output concise and speakable
// ---------------------------------------------------------------------------

function formatRecentActivity(interactions: Interaction[]): string {
  if (interactions.length === 0) return "No recent activity on file.";

  return interactions
    .slice(0, 3)
    .map((i) => {
      const date = new Date(i.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      return `${date}: ${i.type} — ${i.summary}`;
    })
    .join("; ");
}

function buildToolResponse(result: CrmLookupResult): ToolResponse {
  const { contact, recent_interactions } = result;

  return {
    contact_found: true,
    summary:
      `${contact.first_name} ${contact.last_name} from ${contact.company}. ` +
      `${contact.account_status} customer on the ${contact.plan} plan.`,
    details: {
      name: `${contact.first_name} ${contact.last_name}`,
      company: contact.company,
      role: contact.role,
      account_status: contact.account_status,
      plan: contact.plan,
      recent_activity: formatRecentActivity(recent_interactions),
    },
  };
}

// ---------------------------------------------------------------------------
// Route handler — GET /api/tools/crm-lookup?phone_number=...&name=...
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const phoneNumber = searchParams.get("phone_number");
  const name = searchParams.get("name");

  if (!phoneNumber && !name) {
    return NextResponse.json(
      {
        contact_found: false,
        summary: "No search criteria provided. Please provide a phone number or name.",
      } satisfies ToolResponse,
      { status: 400 },
    );
  }

  try {
    let result: CrmLookupResult | null = null;

    if (phoneNumber) {
      result = await searchByPhone(phoneNumber);
    }

    // Fall back to name search if phone lookup returned nothing.
    if (!result && name) {
      result = await searchByName(name);
    }

    if (!result) {
      return NextResponse.json({
        contact_found: false,
        summary: "No matching contact found in our records.",
      } satisfies ToolResponse);
    }

    return NextResponse.json(buildToolResponse(result));
  } catch (error) {
    console.error("CRM lookup error:", error);
    return NextResponse.json(
      {
        contact_found: false,
        summary: "I wasn't able to look up the contact right now. Let me try to help without that information.",
      } satisfies ToolResponse,
      { status: 502 },
    );
  }
}
