import type { ReactNode } from "react";
import { Reveal } from "@/components/ui/Reveal";

interface PageHeaderProps {
  eyebrow: string;
  title: ReactNode;
  lede?: ReactNode;
}

/**
 * The masthead each page opens on.
 *
 * The top padding clears the fixed bar deliberately: a route page starts at
 * the top of the document, where the homepage starts behind a full-height
 * hero, so nothing here is pushed clear of the header by accident.
 */
export function PageHeader({ eyebrow, title, lede }: PageHeaderProps) {
  return (
    <header className="w-full pb-[clamp(2rem,5vh,3.5rem)] pt-[calc(3.5rem+clamp(3rem,9vh,6rem))]">
      <div className="mx-auto w-full max-w-[var(--wide)] px-[var(--pad)]">
        <Reveal>
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="display-type mt-4 max-w-[18ch] text-ink">{title}</h1>
          {lede && <p className="lede mt-6 max-w-[48ch]">{lede}</p>}
        </Reveal>
      </div>
    </header>
  );
}
