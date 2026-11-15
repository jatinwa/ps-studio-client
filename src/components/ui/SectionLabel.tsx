interface SectionLabelProps {
  index: string;
  title: string;
  /** Rendered beneath the rule, for chapters that want a standfirst. */
  note?: string;
  className?: string;
}

/** Chapter marker: index, title, hairline. Used at the head of every chapter. */
export function SectionLabel({
  index,
  title,
  note,
  className = "",
}: SectionLabelProps) {
  return (
    <div className={className}>
      <div className="flex items-baseline gap-4 border-b border-[var(--line)] pb-2.5">
        <span className="mono-label text-accent">CH. {index}</span>
        <h2 className="font-mono text-[0.75rem] tracking-[0.22em] text-ink-dim uppercase">
          {title}
        </h2>
      </div>
      {note && (
        <p className="mt-3 max-w-prose text-xs leading-relaxed text-ink-dim">
          {note}
        </p>
      )}
    </div>
  );
}
