/**
 * A consent tick that is easy to hit on a phone: the whole row toggles, the
 * box is large, and it can flash when a rider tries to continue without it.
 */
import { forwardRef } from "react";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export const ConsentRow = forwardRef<
  HTMLButtonElement,
  {
    checked: boolean;
    onChange: (next: boolean) => void;
    children: React.ReactNode;
    highlight?: boolean;
    className?: string;
  }
>(function ConsentRow({ checked, onChange, children, highlight, className }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-colors",
        checked ? "border-primary bg-primary/10" : "border-border bg-muted/40",
        highlight && "animate-consent-nudge border-primary",
        className,
      )}
    >
      <span
        className={cn(
          "mt-0.5 grid h-6 w-6 shrink-0 place-content-center rounded-md border-2",
          checked ? "border-primary bg-primary text-primary-foreground" : "border-primary",
        )}
      >
        {checked && <Check className="h-4 w-4" />}
      </span>
      <span className="text-sm leading-snug text-foreground">{children}</span>
    </button>
  );
});