import { z } from "zod";
import { budgetRanges, packages } from "./studio";

const packageIds = packages.map((p) => p.id) as [string, ...string[]];
const budgetIds = budgetRanges.map((b) => b.value) as [string, ...string[]];

/** Today in the user's locale, as YYYY-MM-DD. */
export function todayISO(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

/**
 * One schema, used by the form and by the route handler. Client-side checks are
 * for speed of feedback; the server validates again because client checks are
 * only ever a convenience.
 */
export const inquirySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Please enter your name.")
    .max(120, "That name is too long."),

  email: z
    .string()
    .trim()
    .min(1, "Please enter an email address.")
    .email("That doesn't look like a valid email address."),

  sessionType: z.enum(packageIds, {
    message: "Please choose a session type.",
  }),

  preferredDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Please choose a date.")
    .refine((value) => value >= todayISO(), {
      message: "Please choose today or a future date.",
    }),

  budget: z.enum(budgetIds, { message: "Please choose a budget range." }),

  brief: z
    .string()
    .trim()
    .min(20, "Please give us at least a sentence or two — 20 characters minimum.")
    .max(2000, "Please keep the brief under 2000 characters."),
});

export type InquiryInput = z.infer<typeof inquirySchema>;

/** Field-keyed errors, shaped for rendering next to each input. */
export type FieldErrors = Partial<Record<keyof InquiryInput, string>>;

export function collectErrors(error: z.ZodError<InquiryInput>): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path[0] as keyof InquiryInput | undefined;
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

export type InquiryResponse =
  | { ok: true; reference: string }
  | { ok: false; code: "VALIDATION"; errors: FieldErrors }
  | { ok: false; code: "NO_BACKEND"; message: string }
  | { ok: false; code: "FORWARD_FAILED"; message: string }
  | { ok: false; code: "RATE_LIMITED"; message: string };
