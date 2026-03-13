import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TimeSlot {
  start: string; // ISO 8601
  end: string;
  provider_name?: string;
}

interface BookingRequest {
  date: string; // YYYY-MM-DD
  time: string; // HH:mm (24h)
  duration_minutes?: number;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  appointment_type: string;
  notes?: string;
}

interface Booking {
  id: string;
  date: string;
  time: string;
  duration_minutes: number;
  customer_name: string;
  appointment_type: string;
  confirmation_code: string;
  provider_name: string;
}

interface AvailabilityResponse {
  date: string;
  available_slots: string[];
  summary: string;
}

interface BookingResponse {
  booked: boolean;
  summary: string;
  confirmation_code?: string;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const CALENDAR_API_KEY = process.env.CALENDAR_API_KEY!;
const CALENDAR_BASE_URL =
  process.env.CALENDAR_BASE_URL ?? "https://api.yourcalendar.com/v1";
const REQUEST_TIMEOUT_MS = 5_000;

// ---------------------------------------------------------------------------
// Calendar client
// ---------------------------------------------------------------------------

function timedFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  return fetch(url, {
    ...init,
    signal: controller.signal,
    headers: {
      Authorization: `Bearer ${CALENDAR_API_KEY}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  }).finally(() => clearTimeout(timer));
}

async function fetchAvailableSlots(date: string): Promise<TimeSlot[]> {
  const res = await timedFetch(
    `${CALENDAR_BASE_URL}/availability?date=${encodeURIComponent(date)}`,
  );

  if (!res.ok) {
    throw new Error(`Calendar availability check failed: ${res.status}`);
  }

  const data = (await res.json()) as { slots: TimeSlot[] };
  return data.slots;
}

async function createBooking(request: BookingRequest): Promise<Booking> {
  const res = await timedFetch(`${CALENDAR_BASE_URL}/bookings`, {
    method: "POST",
    body: JSON.stringify({
      date: request.date,
      time: request.time,
      duration_minutes: request.duration_minutes ?? 30,
      customer: {
        name: request.customer_name,
        phone: request.customer_phone,
        email: request.customer_email,
      },
      type: request.appointment_type,
      notes: request.notes,
    }),
  });

  if (res.status === 409) {
    throw new ConflictError("That time slot is no longer available.");
  }

  if (!res.ok) {
    throw new Error(`Booking creation failed: ${res.status}`);
  }

  return (await res.json()) as Booking;
}

class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}

// ---------------------------------------------------------------------------
// Formatting — produce concise, speakable output
// ---------------------------------------------------------------------------

function formatTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

function isValidDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const parsed = new Date(value + "T00:00:00");
  return !isNaN(parsed.getTime());
}

function isValidTime(value: string): boolean {
  if (!TIME_RE.test(value)) return false;
  const [h, m] = value.split(":").map(Number);
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

/**
 * GET /api/tools/calendar-booking?date=2025-03-15
 * Returns available time slots for a given date.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");

  if (!date || !isValidDate(date)) {
    return NextResponse.json(
      {
        date: date ?? "",
        available_slots: [],
        summary:
          "Please provide a valid date in YYYY-MM-DD format to check availability.",
      } satisfies AvailabilityResponse,
      { status: 400 },
    );
  }

  try {
    const slots = await fetchAvailableSlots(date);

    if (slots.length === 0) {
      return NextResponse.json({
        date,
        available_slots: [],
        summary: `There are no available slots on ${formatDate(date)}. Would you like to check another date?`,
      } satisfies AvailabilityResponse);
    }

    const times = slots.map((s) => formatTime(s.start));

    const summary =
      slots.length === 1
        ? `There is one available slot on ${formatDate(date)} at ${times[0]}.`
        : `There are ${slots.length} available slots on ${formatDate(date)}: ${times.join(", ")}.`;

    return NextResponse.json({
      date,
      available_slots: times,
      summary,
    } satisfies AvailabilityResponse);
  } catch (error) {
    console.error("Availability check failed:", error);
    return NextResponse.json(
      {
        date,
        available_slots: [],
        summary:
          "I wasn't able to check availability right now. Can I try again in a moment?",
      } satisfies AvailabilityResponse,
      { status: 502 },
    );
  }
}

/**
 * POST /api/tools/calendar-booking
 * Books an appointment at the specified date/time.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: BookingRequest;
  try {
    body = (await request.json()) as BookingRequest;
  } catch {
    return NextResponse.json(
      { booked: false, summary: "Invalid request body." } satisfies BookingResponse,
      { status: 400 },
    );
  }

  // Validate required fields.
  const missing: string[] = [];
  if (!body.date) missing.push("date");
  if (!body.time) missing.push("time");
  if (!body.customer_name) missing.push("customer_name");
  if (!body.customer_phone) missing.push("customer_phone");
  if (!body.appointment_type) missing.push("appointment_type");

  if (missing.length > 0) {
    return NextResponse.json(
      {
        booked: false,
        summary: `Missing required fields: ${missing.join(", ")}.`,
      } satisfies BookingResponse,
      { status: 400 },
    );
  }

  if (!isValidDate(body.date)) {
    return NextResponse.json(
      {
        booked: false,
        summary: "The date format is invalid. Please use YYYY-MM-DD.",
      } satisfies BookingResponse,
      { status: 400 },
    );
  }

  if (!isValidTime(body.time)) {
    return NextResponse.json(
      {
        booked: false,
        summary: "The time format is invalid. Please use HH:mm in 24-hour format.",
      } satisfies BookingResponse,
      { status: 400 },
    );
  }

  try {
    const booking = await createBooking(body);

    const readableDate = formatDate(booking.date);
    const readableTime = formatTime(
      `${booking.date}T${booking.time}:00`,
    );
    const duration = booking.duration_minutes;

    return NextResponse.json({
      booked: true,
      confirmation_code: booking.confirmation_code,
      summary:
        `Your ${body.appointment_type} appointment is confirmed for ${readableDate} ` +
        `at ${readableTime}, ${duration} minutes, with ${booking.provider_name}. ` +
        `Your confirmation code is ${booking.confirmation_code}.`,
    } satisfies BookingResponse);
  } catch (error) {
    if (error instanceof ConflictError) {
      return NextResponse.json(
        {
          booked: false,
          summary:
            "That time slot was just taken. Would you like to pick a different time?",
        } satisfies BookingResponse,
        { status: 409 },
      );
    }

    console.error("Booking failed:", error);
    return NextResponse.json(
      {
        booked: false,
        summary:
          "I wasn't able to complete the booking right now. Would you like me to try again?",
      } satisfies BookingResponse,
      { status: 502 },
    );
  }
}
