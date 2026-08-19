import { Check } from "lucide-react";
import type { CatalogPlan } from "@/lib/catalog.functions";
import { minDurationDays, minDurationQuote } from "@/lib/pricing";
import { rupees } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";
import { BenefitBlock, InfoNote } from "@/components/drivex/Blocks";

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
  // The same engine that bills the rider on the dates screen produces the
  // headline numbers here, so the two can never disagree.
  const minDays = minDurationDays(plan);
  const quote = minDurationQuote(plan);
  const dayRate = quote.perDay ?? plan.rental_amount;
  const periodTotal = plan.plan_type === "RTO" ? quote.chargesTotal : quote.rentAmount;
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

      {/* Zone 1 — the rent, and nothing else. This is the biggest number on the
          card so it can never be confused with the amount including deposit. */}
      <div className="mt-3 rounded-2xl border border-primary/40 bg-primary/10 p-3">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {t("rentZoneLabel", { period: plan.billing_period })}
        </p>
        <p className="mt-0.5 flex items-baseline gap-1.5">
          <span className="text-3xl font-bold leading-none">{rupees(periodTotal)}</span>
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("perDayApprox", { amount: rupees(dayRate) })}
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">{t("rentOnlyNote")}</p>
      </div>

      {/* Zone 2 — the deposit, visually separate and marked as coming back. */}
      {plan.deposit_amount > 0 && (
        <div className="mt-2 rounded-2xl border border-dashed border-border bg-card/60 p-3">
          <p className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-muted-foreground">{t("depositRefundableLabel")}</span>
            <span className="font-semibold">{rupees(plan.deposit_amount)}</span>
          </p>
          <p className="mt-0.5 text-[11px] text-success">{t("depositBackShort")}</p>
        </div>
      )}

      {/* Zone 3 — what leaves the rider's pocket right now. Kept small on
          purpose: it is a step, not the price of the bike. */}
      <div className="mt-2 flex items-baseline justify-between gap-3 rounded-2xl bg-secondary px-3 py-2 text-sm">
        <span className="font-medium text-secondary-foreground">{t("payTodayLabel")}</span>
        <span className="font-semibold">{rupees(plan.reservation_amount)}</span>
      </div>

      <dl className="mt-3 space-y-1.5 text-sm">
        <div className="flex justify-between gap-4">
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

      <BenefitBlock
        className="mt-3"
        title={t("freeWithBikeTitle")}
        body={t("helmetIncludedNote")}
      />

      <div className="mt-2">
        <InfoNote>{t("minDurationNote", { days: minDays })}</InfoNote>
      </div>
    </button>
  );
}