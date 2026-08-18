import { Check, ShieldCheck } from "lucide-react";
import type { CatalogPlan } from "@/lib/catalog.functions";
import { minDurationDays, planDayRate } from "@/lib/pricing";
import { rupees } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";

export function PlanCard({
  plan,
  selected,
  onSelect,
}: {
  plan: CatalogPlan;
  selected: boolean;
  onSelect: () => void;
}) {
  const { t } = useLanguage();
  const dayRate = planDayRate(plan);
  const minDays = minDurationDays(plan);
  const title = t(
    plan.plan_type === "DAILY"
      ? "planDaily"
      : plan.plan_type === "WEEKLY"
        ? "planWeekly"
        : plan.plan_type === "MONTHLY"
          ? "planMonthly"
          : "planRto",
  );

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
            {plan.vehicle_condition === "NEW" ? t("newBike") : t("refurbishedBike")}
          </p>
        </div>
        {selected && (
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Check className="h-4 w-4" />
          </span>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="text-2xl font-semibold">{rupees(dayRate)}</span>
        <span className="text-xs text-muted-foreground">{t("perDayLabel")}</span>
      </div>

      <dl className="mt-3 space-y-1.5 text-sm">
        {plan.deposit_amount > 0 && (
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">{t("depositRefundableLabel")}</dt>
            <dd className="font-medium">{rupees(plan.deposit_amount)}</dd>
          </div>
        )}
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">
            {t("totalForPeriod", { period: plan.billing_period })}
          </dt>
          <dd className="font-medium">{rupees(plan.rental_amount)}</dd>
        </div>
        <div className="flex justify-between gap-4 border-t border-border pt-1.5">
          <dt className="text-muted-foreground">{t("kmIncluded")}</dt>
          <dd className="font-medium">
            {t("kmIncludedValue", {
              km: plan.included_km,
              rate: rupees(plan.extra_km_rate),
            })}
          </dd>
        </div>
        {plan.plan_type === "RTO" && plan.rto_total_months && (
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">{t("ownershipAfter")}</dt>
            <dd className="font-medium">
              {t("ownershipValue", { months: plan.rto_total_months })}
            </dd>
          </div>
        )}
      </dl>

      <p className="mt-3 rounded-xl bg-secondary px-3 py-2 text-xs text-secondary-foreground">
        {t("reserveHoldNote", { reserve: rupees(plan.reservation_amount) })}
      </p>

      <p className="mt-2 text-[11px] text-muted-foreground">
        {t("minDurationNote", { days: minDays })}
      </p>

      <p className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-primary">
        <ShieldCheck className="h-3.5 w-3.5" />
        {t("helmetIncluded")}
      </p>
    </button>
  );
}