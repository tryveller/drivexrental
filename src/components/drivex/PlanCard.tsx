import { Check } from "lucide-react";
import type { CatalogPlan } from "@/lib/catalog.functions";
import { buildQuote } from "@/lib/pricing";
import { rupees } from "@/lib/format";
import { cn } from "@/lib/utils";

export function PlanCard({
  plan,
  selected,
  onSelect,
}: {
  plan: CatalogPlan;
  selected: boolean;
  onSelect: () => void;
}) {
  const quote = buildQuote(plan);
  const title =
    plan.plan_type === "DAILY"
      ? "Daily rental"
      : plan.plan_type === "WEEKLY"
        ? "Weekly rental"
        : plan.plan_type === "MONTHLY"
          ? "Monthly rental"
          : "Rent to own";

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex h-full w-full flex-col rounded-2xl border p-4 text-left transition-colors",
        selected
          ? "border-primary bg-primary/10 ring-1 ring-primary"
          : "border-border bg-card/80 backdrop-blur hover:border-primary/40",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{title}</p>
          <p className="text-sm text-muted-foreground">
            {rupees(plan.rental_amount)} / {plan.billing_period} ·{" "}
            {plan.vehicle_condition === "NEW" ? "New bike" : "Refurbished bike"}
          </p>
        </div>
        {selected && (
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Check className="h-4 w-4" />
          </span>
        )}
      </div>

      <dl className="mt-3 space-y-1.5 text-sm">
        {quote.atHub.map((line) => (
          <div key={line.label} className="flex justify-between gap-4">
            <dt className="text-muted-foreground">{line.label}</dt>
            <dd className="font-medium">{rupees(line.amount)}</dd>
          </div>
        ))}
        <div className="flex justify-between gap-4 border-t border-border pt-1.5">
          <dt className="text-muted-foreground">Kilometres included</dt>
          <dd className="font-medium">
            {plan.included_km} km, then {rupees(plan.extra_km_rate)}/km
          </dd>
        </div>
        {plan.plan_type === "RTO" && plan.rto_total_months && (
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Ownership after</dt>
            <dd className="font-medium">{plan.rto_total_months} monthly payments</dd>
          </div>
        )}
      </dl>

      <p className="mt-3 rounded-xl bg-secondary px-3 py-2 text-xs text-secondary-foreground">
        Pay {rupees(plan.reservation_amount)} now to reserve. It is adjusted against{" "}
        {rupees(quote.totalInitialLiability)} due at the hub, leaving{" "}
        {rupees(quote.amountAtHub)} to pay there.
      </p>
    </button>
  );
}