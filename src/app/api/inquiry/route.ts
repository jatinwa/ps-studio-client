import { NextResponse } from "next/server";
import {
  collectErrors,
  inquirySchema,
  type InquiryResponse,
} from "@/lib/inquiry";

/**
 * Inquiry endpoint.
 *
 * Behaviour is deliberate about one thing: it NEVER reports success unless the
 * submission was actually handed to a configured destination. With no
 * destination set it returns 503 / NO_BACKEND and the form tells the visitor
 * to email instead. A portfolio site that silently swallows leads is worse
 * than one with no form.
 *
 * Configure a destination with INQUIRY_WEBHOOK_URL (any endpoint that accepts
 * JSON — Formspree, Zapier, a Slack/Discord webhook, your own CRM).
 */

const WEBHOOK = process.env.INQUIRY_WEBHOOK_URL;

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
    return json(
      { ok: false, code: "VALIDATION", errors: {} },
      400,
    );
  }

  const parsed = inquirySchema.safeParse(body);
  if (!parsed.success) {
    return json(
      { ok: false, code: "VALIDATION", errors: collectErrors(parsed.error) },
      422,
    );
  }

  const ref = reference();
  const payload = {
    reference: ref,
    receivedAt: new Date().toISOString(),
    ...parsed.data,
  };

  if (!WEBHOOK) {
    // Development fallback. Log it so it isn't lost, and be explicit that
    // nothing was delivered.
    console.warn(
      `[inquiry] INQUIRY_WEBHOOK_URL is not set — nothing was sent.\n` +
        `${JSON.stringify(payload, null, 2)}`,
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

  try {
    const res = await fetch(WEBHOOK, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      console.error(`[inquiry] webhook responded ${res.status}`);
      return json(
        {
          ok: false,
          code: "FORWARD_FAILED",
          message:
            "We couldn't deliver your inquiry just now. Please try again, or email the studio directly.",
        },
        502,
      );
    }
  } catch (error) {
    console.error("[inquiry] webhook request failed", error);
    return json(
      {
        ok: false,
        code: "FORWARD_FAILED",
        message:
          "We couldn't reach our inquiry service. Please try again, or email the studio directly.",
      },
      502,
    );
  }

  return json({ ok: true, reference: ref }, 200);
}

function json(body: InquiryResponse, status: number) {
  return NextResponse.json(body, { status });
}
