import type { ReactNode } from "react";
import { Phone } from "lucide-react";

import { DRIVEX_SUPPORT_PHONE } from "@/lib/format";
import { useLanguage, type TKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * Four visual treatments the rider must never confuse:
 * something he GETS free, something he MUST DO, plain information, and money.
 * Each one has its own shape and colour so the category is readable at a glance.
 */

/** Something the rider gets at no cost. Never looks like a choice or an action. */
export function BenefitBlock({
  image,
  title,
  body,
  className,
}: {
  image?: string;
  title: string;
  body?: string;
  className?: string;
}) {
  const { t } = useLanguage();
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl border border-success/40 bg-success/10 p-3",
        className,
      )}
    >
      {image ? (
        <img
          src={image}
          alt={title}
          width={96}
          height={96}
          loading="lazy"
          className="h-12 w-12 shrink-0 rounded-xl object-cover"
        />
      ) : null}
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
          <span className="rounded-full bg-success px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-success-foreground">
            {t("freeTag")}
          </span>
          {title}
        </p>
        {body ? <p className="mt-0.5 text-xs text-muted-foreground">{body}</p> : null}
      </div>
    </div>
  );
}

/** Quiet information — never competes with an action. */
export function InfoNote({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl bg-secondary/70 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
      {children}
    </p>
  );
}

/**
 * Trust before a document or permission ask: what we need, why, what next.
 * Three short lines, no paragraphs.
 */
export function TrustPanel({
  items,
}: {
  items: { title: string; body: string }[];
}) {
  return (
    <ul className="grid gap-2 rounded-2xl border border-border bg-card/70 p-3 sm:grid-cols-3">
      {items.map((item) => (
        <li key={item.title}>
          <p className="text-xs font-semibold text-primary">{item.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{item.body}</p>
        </li>
      ))}
    </ul>
  );
}

/**
 * The rider's instinct when anything goes wrong is to call somebody, so the
 * phone action dials straight out — no chat, no form in between.
 */
export function CallDriveXButton({
  full,
  className,
}: {
  full?: boolean;
  className?: string;
}) {
  const { t } = useLanguage();
  return (
    <a
      href={`tel:${DRIVEX_SUPPORT_PHONE}`}
      aria-label={t("callDrivexLabel")}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full border border-primary/50 bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/20",
        full && "w-full",
        className,
      )}
    >
      <Phone className="h-4 w-4" />
      {t("callDrivexLabel")}
    </a>
  );
}

/**
 * Reinforcement, not translation coverage: at money / document / pickup
 * moments the chosen language carries the line and a short English line sits
 * under it. When the rider already reads English there is nothing to repeat.
 */
export function Bilingual({
  k,
  vars,
  className,
}: {
  k: TKey;
  vars?: Record<string, string | number>;
  className?: string;
}) {
  const { active, t, tIn } = useLanguage();
  return (
    <span className={cn("block", className)}>
      <span className="block">{t(k, vars)}</span>
      {active === "en" ? null : (
        <span className="mt-0.5 block text-[11px] text-muted-foreground">{tIn("en", k, vars)}</span>
      )}
    </span>
  );
}