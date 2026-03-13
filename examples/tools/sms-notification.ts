import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SmsRequest {
  phone_number: string;
  message: string;
}

interface TwilioMessageResponse {
  sid: string;
  status: string;
  to: string;
  body: string;
  error_code: number | null;
  error_message: string | null;
}

interface ToolResponse {
  sent: boolean;
  summary: string;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID!;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN!;
const TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER!;

const TWILIO_BASE_URL = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}`;
const REQUEST_TIMEOUT_MS = 8_000;
const MAX_SMS_LENGTH = 1_600; // Twilio concatenated SMS limit

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Validates an E.164 phone number. Accepts optional leading +,
 * followed by 10-15 digits.
 */
function isValidPhoneNumber(value: string): boolean {
  return /^\+?[1-9]\d{9,14}$/.test(value);
}

function normalizePhoneNumber(value: string): string {
  const digits = value.replace(/[^\d+]/g, "");
  return digits.startsWith("+") ? digits : `+${digits}`;
}

// ---------------------------------------------------------------------------
// Twilio client
// ---------------------------------------------------------------------------

async function sendSms(to: string, body: string): Promise<TwilioMessageResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const credentials = Buffer.from(
    `${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`,
  ).toString("base64");

  const params = new URLSearchParams({
    To: to,
    From: TWILIO_FROM_NUMBER,
    Body: body,
  });

  try {
    const res = await fetch(`${TWILIO_BASE_URL}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
      signal: controller.signal,
    });

    const data = (await res.json()) as TwilioMessageResponse;

    if (!res.ok) {
      throw new Error(
        `Twilio error ${data.error_code}: ${data.error_message ?? res.statusText}`,
      );
    }

    return data;
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Route handler — POST /api/tools/sms-notification
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: SmsRequest;
  try {
    body = (await request.json()) as SmsRequest;
  } catch {
    return NextResponse.json(
      { sent: false, summary: "Invalid request body." } satisfies ToolResponse,
      { status: 400 },
    );
  }

  if (!body.phone_number || !body.message) {
    return NextResponse.json(
      {
        sent: false,
        summary: "Both phone_number and message are required.",
      } satisfies ToolResponse,
      { status: 400 },
    );
  }

  if (!isValidPhoneNumber(body.phone_number)) {
    return NextResponse.json(
      {
        sent: false,
        summary:
          "The phone number doesn't look valid. Please provide a number with country code, like +15551234567.",
      } satisfies ToolResponse,
      { status: 400 },
    );
  }

  if (body.message.length > MAX_SMS_LENGTH) {
    return NextResponse.json(
      {
        sent: false,
        summary: `The message is too long (${body.message.length} characters). Please keep it under ${MAX_SMS_LENGTH} characters.`,
      } satisfies ToolResponse,
      { status: 400 },
    );
  }

  const normalizedPhone = normalizePhoneNumber(body.phone_number);

  try {
    const result = await sendSms(normalizedPhone, body.message);

    // Mask the phone number for the spoken confirmation.
    const lastFour = normalizedPhone.slice(-4);

    return NextResponse.json({
      sent: true,
      summary: `The text message has been sent to the number ending in ${lastFour}. Message ID: ${result.sid}.`,
    } satisfies ToolResponse);
  } catch (error) {
    console.error("SMS send failed:", error);

    const message =
      error instanceof Error ? error.message : "Unknown error";

    // Provide a speakable error without leaking internal details.
    if (message.includes("unverified")) {
      return NextResponse.json(
        {
          sent: false,
          summary:
            "That phone number isn't verified for SMS. Please check the number and try again.",
        } satisfies ToolResponse,
        { status: 422 },
      );
    }

    return NextResponse.json(
      {
        sent: false,
        summary:
          "I wasn't able to send the text message right now. Would you like me to try again?",
      } satisfies ToolResponse,
      { status: 502 },
    );
  }
}
