"use client";

import { useCallback, useRef, useState } from "react";
import {
  budgetRanges,
  formatPrice,
  packages,
  studio,
  type PackageSpec,
} from "@/lib/studio";
import {
  collectErrors,
  inquirySchema,
  todayISO,
  type FieldErrors,
  type InquiryInput,
  type InquiryResponse,
} from "@/lib/inquiry";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Reveal } from "@/components/ui/Reveal";

type Status = "idle" | "submitting" | "success" | "error";

/**
 * Move focus after React has committed the new state. A timeout rather than
 * requestAnimationFrame on purpose: rAF is suspended in background tabs, so an
 * error summary submitted in a hidden tab would never receive focus.
 */
function focusSoon(ref: React.RefObject<HTMLElement | null>) {
  setTimeout(() => ref.current?.focus(), 0);
}

const EMPTY: InquiryInput = {
  name: "",
  email: "",
  sessionType: packages[0].id,
  preferredDate: "",
  budget: "undecided",
  brief: "",
};

/**
 * `standalone` suppresses this chapter's own masthead. On the homepage it is
 * one numbered beat in a sequence and needs its heading; on its own page the
 * page supplies the heading, and leaving both in prints the same sentence
 * twice and carries homepage chapter numbering onto a page that has none.
 */
export function Booking({ standalone = false }: { standalone?: boolean }) {
  const [values, setValues] = useState<InquiryInput>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);

  const summaryRef = useRef<HTMLDivElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  const set = useCallback(
    <K extends keyof InquiryInput>(key: K, value: InquiryInput[K]) => {
      setValues((v) => ({ ...v, [key]: value }));
      setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
    },
    [],
  );

  /** Choosing a package from the cards or the order-ahead panel. */
  const choosePackage = useCallback((id: string) => {
    setValues((v) => ({ ...v, sessionType: id }));
    const field = formRef.current?.querySelector<HTMLElement>("#inq-date");
    formRef.current?.scrollIntoView({ block: "center" });
    field?.focus({ preventScroll: true });
  }, []);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setServerMessage(null);

    const parsed = inquirySchema.safeParse(values);
    if (!parsed.success) {
      const next = collectErrors(parsed.error);
      setErrors(next);
      setStatus("error");
      // Move focus to the summary so the failure is announced, not just shown.
      focusSoon(summaryRef);
      return;
    }

    setErrors({});
    setStatus("submitting");

    try {
      const res = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = (await res.json()) as InquiryResponse;

      if (data.ok) {
        setReference(data.reference);
        setStatus("success");
        setValues(EMPTY);
        return;
      }

      if (data.code === "VALIDATION") {
        setErrors(data.errors);
        setStatus("error");
        focusSoon(summaryRef);
        return;
      }

      setServerMessage(data.message);
      setStatus("error");
      focusSoon(summaryRef);
    } catch {
      setServerMessage(
        "We couldn't reach the studio's inquiry service. Please check your connection and try again.",
      );
      setStatus("error");
      focusSoon(summaryRef);
    }
  };

  const errorList = Object.entries(errors).filter(([, v]) => Boolean(v)) as [
    keyof InquiryInput,
    string,
  ][];

  return (
    <section
      id="book"
      aria-label="Book a session"
      className="w-full bg-bg px-5 py-24 sm:px-8 sm:py-32"
    >
      <div className="mx-auto max-w-[1800px]">
        {!standalone && (
          <>
            <SectionLabel index="08" title="Book a Session" />

            <Reveal className="mt-10 max-w-3xl">
              <p className="title-type text-ink">
                Tell us what you need.
                <span className="italic text-accent"> We’ll tell you how.</span>
              </p>
            </Reveal>
          </>
        )}

        {/* Packages */}
        <ul className={`${standalone ? "" : "mt-16"} grid gap-5 lg:grid-cols-3`}>
          {packages.map((pkg, i) => (
            <li key={pkg.id}>
              <Reveal delay={i * 0.06} className="h-full">
                <PackageCard
                  pkg={pkg}
                  selected={values.sessionType === pkg.id}
                  onSelect={() => choosePackage(pkg.id)}
                />
              </Reveal>
            </li>
          ))}
        </ul>

        <p className="mt-6 max-w-prose text-xs leading-relaxed text-ink-dim">
          {studio.bookingNotice}
        </p>

        {/* Form + order-ahead */}
        <div className="mt-20 grid gap-12 lg:grid-cols-[1fr_21rem] lg:gap-14">
          <div>
            <h3 className="mono-label border-b border-[var(--line)] pb-2.5 text-accent">
              PROJECT INQUIRY
            </h3>

            {/* Success */}
            {status === "success" && (
              <div
                role="status"
                className="mt-8 border border-accent/50 bg-accent/5 p-5"
              >
                <p className="mono-label text-accent">INQUIRY RECEIVED</p>
                <p className="mt-3 text-sm leading-relaxed text-ink-dim">
                  Thank you — your brief reached the studio. Your reference is{" "}
                  <span className="font-mono text-ink">{reference}</span>. We
                  reply to every inquiry, and we’ll confirm whether your date is
                  available in writing.
                </p>
                <button
                  type="button"
                  onClick={() => setStatus("idle")}
                  className="focus-frame mono-label mt-5 border border-[var(--line)] px-4 py-2.5 text-ink transition-colors hover:border-accent hover:text-accent"
                >
                  SEND ANOTHER
                </button>
              </div>
            )}

            {status !== "success" && (
              <>
                {/* Error summary */}
                {(errorList.length > 0 || serverMessage) && (
                  <div
                    ref={summaryRef}
                    tabIndex={-1}
                    role="alert"
                    className="mt-8 border border-[#b4432f]/50 bg-[#b4432f]/10 p-5"
                  >
                    <p className="mono-label text-[#b4432f]">
                      {serverMessage ? "NOT SENT" : "CHECK THESE FIELDS"}
                    </p>
                    {serverMessage && (
                      <p className="mt-3 text-sm leading-relaxed text-ink-dim">
                        {serverMessage}
                        {studio.contact.email && (
                          <>
                            {" "}
                            <a
                              href={`mailto:${studio.contact.email}`}
                              className="focus-frame underline decoration-champagne/50 underline-offset-4 hover:text-accent"
                            >
                              {studio.contact.email}
                            </a>
                          </>
                        )}
                      </p>
                    )}
                    {errorList.length > 0 && (
                      <ul className="mt-3 space-y-1.5">
                        {errorList.map(([field, message]) => (
                          <li key={field} className="text-sm text-ink-dim">
                            <a
                              href={`#inq-${field}`}
                              className="focus-frame underline decoration-[#b4432f]/50 underline-offset-4 hover:text-ink"
                            >
                              {message}
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                <form
                  ref={formRef}
                  onSubmit={onSubmit}
                  noValidate
                  className="mt-8 grid gap-6 sm:grid-cols-2"
                >
                  <Field
                    id="inq-name"
                    label="NAME"
                    error={errors.name}
                    required
                  >
                    <input
                      id="inq-name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      value={values.name}
                      onChange={(e) => set("name", e.target.value)}
                      aria-invalid={Boolean(errors.name)}
                      aria-describedby={errors.name ? "inq-name-error" : undefined}
                      className={inputClass(Boolean(errors.name))}
                    />
                  </Field>

                  <Field
                    id="inq-email"
                    label="EMAIL"
                    error={errors.email}
                    required
                  >
                    <input
                      id="inq-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      value={values.email}
                      onChange={(e) => set("email", e.target.value)}
                      aria-invalid={Boolean(errors.email)}
                      aria-describedby={errors.email ? "inq-email-error" : undefined}
                      className={inputClass(Boolean(errors.email))}
                    />
                  </Field>

                  <Field
                    id="inq-sessionType"
                    label="SESSION TYPE"
                    error={errors.sessionType}
                    required
                  >
                    <select
                      id="inq-sessionType"
                      name="sessionType"
                      value={values.sessionType}
                      onChange={(e) => set("sessionType", e.target.value)}
                      aria-invalid={Boolean(errors.sessionType)}
                      className={inputClass(Boolean(errors.sessionType))}
                    >
                      {packages.map((pkg) => (
                        <option key={pkg.id} value={pkg.id} className="bg-[var(--surface)]">
                          {pkg.name}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field
                    id="inq-preferredDate"
                    label="PREFERRED DATE"
                    error={errors.preferredDate}
                    hint="Availability is confirmed separately."
                    required
                  >
                    <input
                      id="inq-date"
                      name="preferredDate"
                      type="date"
                      min={todayISO()}
                      value={values.preferredDate}
                      onChange={(e) => set("preferredDate", e.target.value)}
                      aria-invalid={Boolean(errors.preferredDate)}
                      aria-describedby={
                        errors.preferredDate
                          ? "inq-preferredDate-error"
                          : "inq-preferredDate-hint"
                      }
                      className={inputClass(Boolean(errors.preferredDate))}
                    />
                  </Field>

                  <Field
                    id="inq-budget"
                    label="BUDGET RANGE"
                    error={errors.budget}
                    required
                  >
                    <select
                      id="inq-budget"
                      name="budget"
                      value={values.budget}
                      onChange={(e) => set("budget", e.target.value)}
                      aria-invalid={Boolean(errors.budget)}
                      className={inputClass(Boolean(errors.budget))}
                    >
                      {budgetRanges.map((range) => (
                        <option key={range.value} value={range.value} className="bg-[var(--surface)]">
                          {range.label}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <div className="sm:col-span-2">
                    <Field
                      id="inq-brief"
                      label="PROJECT BRIEF"
                      error={errors.brief}
                      hint={`${values.brief.trim().length} / 2000 characters`}
                      required
                    >
                      <textarea
                        id="inq-brief"
                        name="brief"
                        rows={6}
                        value={values.brief}
                        onChange={(e) => set("brief", e.target.value)}
                        placeholder="What are we making, who is it for, and when does it need to be delivered?"
                        aria-invalid={Boolean(errors.brief)}
                        aria-describedby={
                          errors.brief ? "inq-brief-error" : "inq-brief-hint"
                        }
                        className={`${inputClass(Boolean(errors.brief))} resize-y`}
                      />
                    </Field>
                  </div>

                  <div className="sm:col-span-2 flex flex-wrap items-center gap-5">
                    <button
                      type="submit"
                      disabled={status === "submitting"}
                      className="focus-frame mono-label border border-accent px-7 py-4 text-accent transition-colors duration-300 hover:bg-accent hover:text-bg disabled:cursor-wait disabled:opacity-55 disabled:hover:bg-transparent disabled:hover:text-accent"
                    >
                      {status === "submitting" ? "SENDING…" : "SEND INQUIRY"}
                    </button>
                    <p className="mono-label text-ink-dim">
                      Required fields are marked
                      <span aria-hidden className="text-[#b4432f]"> *</span>
                    </p>
                  </div>
                </form>
              </>
            )}
          </div>

          {/* Order-ahead card */}
          <aside className="h-fit border border-[var(--line)] lg:sticky lg:top-24">
            <h3 className="mono-label border-b border-[var(--line)] px-4 py-3 text-accent">
              REQUEST A DATE
            </h3>
            <div className="px-4 py-4">
              <p className="text-xs leading-relaxed text-ink-dim">
                Pick a package and a date to pre-fill the inquiry. Nothing is
                reserved by doing this — we check the studio diary and crew, then
                confirm in writing.
              </p>

              <ul className="mt-5 space-y-2">
                {packages.map((pkg) => (
                  <li key={pkg.id}>
                    <button
                      type="button"
                      onClick={() => choosePackage(pkg.id)}
                      aria-pressed={values.sessionType === pkg.id}
                      className={`focus-frame flex w-full items-baseline justify-between gap-3 border px-3 py-3 text-left transition-colors duration-300 ${
                        values.sessionType === pkg.id
                          ? "border-accent/60 bg-accent/8 text-accent"
                          : "border-[var(--line)] text-ink-dim hover:border-ivory/30 hover:text-ink"
                      }`}
                    >
                      <span className="mono-label">
                        {pkg.name.replace(" SESSION", "")}
                      </span>
                      <span className="mono-label shrink-0">
                        {pkg.price === null ? "QUOTE" : formatPrice(pkg)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>

              <label
                htmlFor="order-date"
                className="mono-label mt-5 block text-ink-dim"
              >
                PREFERRED DATE
              </label>
              <input
                id="order-date"
                type="date"
                min={todayISO()}
                value={values.preferredDate}
                onChange={(e) => set("preferredDate", e.target.value)}
                className={`${inputClass(false)} mt-2`}
              />

              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById("inq-brief");
                  el?.scrollIntoView({ block: "center" });
                  el?.focus({ preventScroll: true });
                }}
                className="focus-frame mono-label mt-5 block w-full border border-[var(--line)] px-4 py-3.5 text-center text-ink transition-colors hover:border-accent hover:text-accent"
              >
                ADD YOUR REQUIREMENTS
              </button>

              <p className="mt-4 text-[10px] leading-relaxed text-ink-dim">
                Prices are shown only where the studio has published them.
                Everything else is quoted per project.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────── */

function inputClass(invalid: boolean): string {
  return [
    "w-full border bg-[var(--surface)] px-3.5 py-3 font-mono text-[13px] text-ink",
    "placeholder:text-ink-dim transition-colors duration-200",
    "focus:outline-none focus:ring-0",
    invalid
      ? "border-[#b4432f]/60 focus:border-[#b4432f]"
      : "border-[var(--line)] focus:border-accent",
  ].join(" ");
}

function Field({
  id,
  label,
  error,
  hint,
  required,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id === "inq-preferredDate" ? "inq-date" : id} className="mono-label block text-ink-dim">
        {label}
        {required && (
          <span aria-hidden className="text-[#b4432f]"> *</span>
        )}
      </label>
      <div className="mt-2">{children}</div>
      {error ? (
        <p id={`${id}-error`} className="mt-2 text-[11px] text-[#b4432f]">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-2 text-[11px] text-ink-dim">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function PackageCard({
  pkg,
  selected,
  onSelect,
}: {
  pkg: PackageSpec;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      className={`flex h-full flex-col border p-6 transition-colors duration-300 ${
        selected ? "border-accent/60 bg-accent/5" : "border-[var(--line)]"
      }`}
    >
      <h3 className="mono-label text-ink">{pkg.name}</h3>
      <p className="mt-3 font-serif text-xl italic leading-tight text-ink-dim">
        {pkg.summary}
      </p>

      <ul className="mt-6 space-y-2">
        {pkg.includes.map((item) => (
          <li
            key={item}
            className="flex gap-2.5 text-xs leading-relaxed text-ink-dim"
          >
            <span aria-hidden className="mt-1.5 h-px w-2.5 shrink-0 bg-accent-dim" />
            {item}
          </li>
        ))}
      </ul>

      <dl className="mt-6 divide-y divide-[var(--line)] border-y border-[var(--line)]">
        <div className="py-2.5">
          <dt className="mono-label text-ink-dim">DELIVERABLES</dt>
          <dd className="mt-1.5 text-xs leading-relaxed text-ink">
            {pkg.deliverables}
          </dd>
        </div>
        <div className="flex items-baseline justify-between py-2.5">
          <dt className="mono-label text-ink-dim">TURNAROUND</dt>
          <dd className="font-mono text-[11px] text-ink">{pkg.turnaround}</dd>
        </div>
      </dl>

      <p className="mt-6 font-mono text-sm tracking-wider text-accent">
        {formatPrice(pkg)}
      </p>

      <button
        type="button"
        onClick={onSelect}
        className="focus-frame mono-label mt-5 w-full border border-[var(--line)] px-4 py-3.5 text-ink transition-colors duration-300 hover:border-accent hover:text-accent"
      >
        {selected ? "SELECTED — ADD DETAILS" : "CHOOSE THIS SESSION"}
      </button>
    </div>
  );
}
