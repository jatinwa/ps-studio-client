import { NextResponse } from "next/server";
import {
  collectErrors,
  inquirySchema,
  type InquiryResponse,
} from "@/lib/inquiry";
import {
  emailConfigured,
  sendInquiryEmail,
  type InquiryPayload,
} from "@/lib/email";

/**
 * Inquiry endpoint.
 *
 * Behaviour is deliberate about one thing: it NEVER reports success unless the
 * submission was actually handed to a configured destination. With no
 * destination set it returns 503 / NO_BACKEND and the form tells the visitor
 * to email instead. A portfolio site that silently swallows leads is worse
 * than one with no form.
 *
 * Two destinations, either or both:
 *
 *   RESEND_API_KEY        emails the studio's inbox (see lib/email.ts)
 *   INQUIRY_WEBHOOK_URL   POSTs the JSON anywhere that accepts it
 *
 * With both set the enquiry goes to both, and the visitor is told it arrived
 * if ANY destination took it — a dead webhook should not lose a booking that
 * is already sitting in the studio's inbox. Each failure is logged with the
 * reference, so a partial delivery can be traced afterwards.
 */

/* Blank is not set: see the `env` helper in lib/email.ts. */
const WEBHOOK = process.env.INQUIRY_WEBHOOK_URL?.trim() || undefined;

/** Reads secrets, so it must never be pushed to an edge bundle. */
export const runtime = "nodejs";

/** Crude per-instance throttle. Enough to blunt accidental double-submits. */
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 5;
const hits = new Map<string, number[]>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);

  if (hits.size > 500) {
    for (const [k, times] of hits) {
      if (times.every((t) => now - t >= RATE_WINDOW_MS)) hits.delete(k);
    }
  }
  return recent.length > RATE_MAX;
}

function reference(): string {
  const stamp = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `PS-${stamp}-${rand}`;
}

type Attempt = { ok: true } | { ok: false; reason: string };

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "local";

  if (rateLimited(ip)) {
    return json(
      {
        ok: false,
        code: "RATE_LIMITED",
        message: "Too many requests. Please wait a minute and try again.",
      },
      429,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, code: "VALIDATION", errors: {} }, 400);
  }

  const parsed = inquirySchema.safeParse(body);
  if (!parsed.success) {
    return json(
      { ok: false, code: "VALIDATION", errors: collectErrors(parsed.error) },
      422,
    );
  }

  const ref = reference();
  const payload: InquiryPayload = {
    reference: ref,
    receivedAt: new Date().toISOString(),
    ...parsed.data,
  };

  const wantsEmail = emailConfigured();

  if (!wantsEmail && !WEBHOOK) {
    /*
     * Development fallback. Log it so it isn't lost, and be explicit that
     * nothing was delivered — the response below says so too.
     */
    console.warn(
      "[inquiry] no destination configured (set RESEND_API_KEY, or " +
        "INQUIRY_WEBHOOK_URL) — nothing was sent.\n" +
        JSON.stringify(payload, null, 2),
    );
    return json(
      {
        ok: false,
        code: "NO_BACKEND",
        message:
          "This site has no submission endpoint configured, so your inquiry was not sent. Please email the studio directly.",
      },
      503,
    );
  }

  /*
   * Both destinations go at once rather than one after the other: they are
   * independent, and a slow webhook should not hold up the mail. allSettled,
   * so one of them throwing cannot cost us the other's result.
   */
  const settled = await Promise.allSettled<Attempt | null>([
    wantsEmail ? sendInquiryEmail(payload) : Promise.resolve(null),
    WEBHOOK ? forwardToWebhook(payload) : Promise.resolve(null),
  ]);

  let delivered = false;
  settled.forEach((outcome, i) => {
    const which = i === 0 ? "email" : "webhook";
    if (outcome.status === "rejected") {
      console.error(`[inquiry ${ref}] ${which} threw`, outcome.reason);
      return;
    }
    if (outcome.value === null) return; // that destination isn't configured
    if (outcome.value.ok) delivered = true;
    else console.error(`[inquiry ${ref}] ${which} failed: ${outcome.value.reason}`);
  });

  if (!delivered) {
    return json(
      {
        ok: false,
        code: "FORWARD_FAILED",
        message:
          "We couldn't deliver your inquiry just now. Please try again, or contact the studio directly.",
      },
      502,
    );
  }

  return json({ ok: true, reference: ref }, 200);
}

async function forwardToWebhook(payload: InquiryPayload): Promise<Attempt> {
  try {
    const res = await fetch(WEBHOOK as string, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return { ok: false, reason: `responded ${res.status}` };
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: `request failed: ${String(error)}` };
  }
}

function json(body: InquiryResponse, status: number) {
  return NextResponse.json(body, { status });
}
