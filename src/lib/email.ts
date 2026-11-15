import { budgetRanges, packages, studio } from "./studio";
import type { InquiryInput } from "./inquiry";

/**
 * Inquiry email, sent through Resend.
 *
 * Resend's REST API is one POST, so there is no SDK here — the route already
 * owns a fetch-with-timeout-and-explicit-failure pattern for its webhook and
 * this uses the same one rather than introducing a second way to fail.
 *
 * Nothing here ever reports success it did not get. The caller turns a `false`
 * into an honest message for the visitor; it must never be swallowed.
 */

const API = "https://api.resend.com/emails";

/*
 * A variable set to nothing is not set.
 *
 * `.env` files and hosting dashboards both hand back an empty string for a
 * key that was left blank, and `??` does not treat "" as missing — a blank
 * INQUIRY_FROM would have gone out as the From header and been rejected.
 * Trimmed too: a trailing space on a pasted API key is a miserable bug.
 */
function env(name: string): string | undefined {
  const raw = process.env[name];
  const value = raw?.trim();
  return value ? value : undefined;
}

/*
 * Where enquiries land. The studio's own inbox, given by the studio.
 *
 * It lives here rather than in studio.ts because studio.ts is imported by the
 * browser: an address in that file ships in the page source for any scraper
 * to lift. This module is only ever imported by the route handler, so the
 * address stays on the server. INQUIRY_TO overrides it without a deploy.
 */
const DEFAULT_TO = "payalstudiopvtltd@gmail.com";

/** Resend rejects a bare address in `to`, and several are comma-separated. */
function recipients(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/**
 * Everything below comes from a stranger on the internet and lands in the
 * studio's mail client, so it is escaped on the way in. The brief especially:
 * it is free text with a 2000 character budget.
 */
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ENTITIES[c]);

const labelFor = (list: { value: string; label: string }[], v: string) =>
  list.find((x) => x.value === v)?.label ?? v;

const packageName = (id: string) =>
  packages.find((p) => p.id === id)?.name ?? id;

/** 2026-03-14 → "Saturday, 14 March 2026", which is how a date gets read. */
function longDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export interface InquiryPayload extends InquiryInput {
  reference: string;
  receivedAt: string;
}

function rows(p: InquiryPayload): [string, string][] {
  return [
    ["Name", p.name],
    ["Email", p.email],
    ["Session", packageName(p.sessionType)],
    ["Preferred date", longDate(p.preferredDate)],
    ["Budget", labelFor(budgetRanges, p.budget)],
    ["Reference", p.reference],
  ];
}

function text(p: InquiryPayload): string {
  const lines = rows(p).map(([k, v]) => `${k.padEnd(16)}${v}`);
  return [
    `New enquiry — ${studio.name}`,
    "",
    ...lines,
    "",
    "About the day",
    "-------------",
    p.brief,
    "",
    `Received ${p.receivedAt}`,
    `Reply to this email to answer ${p.name} directly.`,
  ].join("\n");
}

function html(p: InquiryPayload): string {
  const cells = rows(p)
    .map(
      ([k, v]) => `
      <tr>
        <td style="padding:7px 16px 7px 0;color:#6a5f51;font:500 12px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.08em;text-transform:uppercase;white-space:nowrap;vertical-align:top">${esc(k)}</td>
        <td style="padding:7px 0;color:#211c15;font:400 15px/1.5 Georgia,'Times New Roman',serif">${esc(v)}</td>
      </tr>`,
    )
    .join("");

  // Inline styles only, and a table for the layout: mail clients strip <style>
  // blocks and have no grid. Plain hex, because a mail client has no :root.
  return `<!doctype html>
<html lang="en"><body style="margin:0;padding:24px;background:#f3eee4">
  <table role="presentation" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#fffdf8;border:1px solid rgba(33,28,21,.14)">
    <tr><td style="padding:28px 28px 0">
      <p style="margin:0;color:#855a20;font:500 12px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.18em;text-transform:uppercase">New enquiry</p>
      <h1 style="margin:10px 0 0;color:#211c15;font:400 26px/1.25 Georgia,'Times New Roman',serif">${esc(p.name)}</h1>
    </td></tr>
    <tr><td style="padding:22px 28px 0">
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%">${cells}</table>
    </td></tr>
    <tr><td style="padding:22px 28px 0">
      <p style="margin:0 0 8px;color:#6a5f51;font:500 12px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.08em;text-transform:uppercase">About the day</p>
      <div style="color:#211c15;font:400 15px/1.65 Georgia,'Times New Roman',serif;white-space:pre-wrap">${esc(p.brief)}</div>
    </td></tr>
    <tr><td style="padding:24px 28px 28px">
      <p style="margin:18px 0 0;padding-top:16px;border-top:1px solid rgba(33,28,21,.14);color:#6a5f51;font:400 13px/1.6 Georgia,'Times New Roman',serif">
        Received ${esc(p.receivedAt)}. Reply to this email to answer ${esc(p.name)} directly.
      </p>
    </td></tr>
  </table>
</body></html>`;
}

export type SendResult =
  | { ok: true }
  | { ok: false; reason: string };

/**
 * True when there is enough configuration to attempt a send at all.
 *
 * Only the key is in question: the destination has a default, so setting
 * RESEND_API_KEY is the single step that turns the form on.
 */
export function emailConfigured(): boolean {
  return Boolean(env("RESEND_API_KEY"));
}

export async function sendInquiryEmail(
  p: InquiryPayload,
): Promise<SendResult> {
  const key = env("RESEND_API_KEY");
  const to = env("INQUIRY_TO") ?? DEFAULT_TO;
  if (!key) return { ok: false, reason: "RESEND_API_KEY is not set" };

  /*
   * Resend will only accept a From on a domain verified in the account. Until
   * one is, their onboarding sender works but delivers ONLY to the address
   * that owns the Resend account — which is why this is worth setting
   * explicitly the moment a domain is verified.
   */
  const from =
    env("INQUIRY_FROM") ?? `${studio.name} <onboarding@resend.dev>`;

  try {
    const res = await fetch(API, {
      method: "POST",
      headers: {
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: recipients(to),
        // so the studio can hit Reply and be writing to the couple
        reply_to: p.email,
        subject: `Enquiry — ${p.name} — ${packageName(p.sessionType)} — ${p.preferredDate}`,
        html: html(p),
        text: text(p),
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      // Resend puts the real reason in the body; without it a 422 is a riddle.
      const detail = await res.text().catch(() => "");
      return {
        ok: false,
        reason: `resend responded ${res.status} ${detail.slice(0, 300)}`,
      };
    }
    /*
     * Where it actually went, with the reference the visitor was shown. The
     * destination is worth printing: while a domain is being verified this is
     * redirected somewhere other than the studio inbox, and a log that says
     * only "sent" would hide that for as long as nobody noticed.
     */
    console.info(`[inquiry ${p.reference}] delivered to ${to}`);
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: `resend request failed: ${String(error)}` };
  }
}
