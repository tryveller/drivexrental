import { ShieldCheck } from "lucide-react";

import { BenefitBlock } from "@/components/drivex/Blocks";
import helmetImage from "@/assets/helmet.jpg";
import {
  helmetCharge,
  type AddonRates,
  type HelmetMode,
  type PlanConfig,
  type RideDuration,
} from "@/lib/pricing";
import { rupees } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";

/**
 * One helmet always ships free with the bike. This picker only covers the
 * optional second helmet — rent it for the ride, or buy it outright.
 */
export function HelmetPicker({
  plan,
  duration,
  rates,
  value,
  onChange,
  disabled,
}: {
  plan: Pick<PlanConfig, "plan_type">;
  duration: RideDuration | null;
  rates: AddonRates;
  value: HelmetMode;
  onChange: (mode: HelmetMode) => void;
  disabled?: boolean;
}) {
  const { t } = useLanguage();
  const monthly = plan.plan_type === "MONTHLY" || plan.plan_type === "RTO";
  const rentAmount = helmetCharge(plan, duration, "RENT", rates);

  const options: { mode: HelmetMode; label: string; hint: string }[] = [
    { mode: "NONE", label: t("helmetNone"), hint: "" },
    {
      mode: "RENT",
      label: t("helmetRentOption"),
      hint: monthly
        ? t("helmetPerMonth", { amount: rates.helmetMonthlyRate })
        : t("helmetPerDay", { amount: rates.helmetDailyRate }),
    },
    {
      mode: "BUY",
      label: t("helmetBuyOption"),
      hint: t("helmetBuyPrice", { amount: rates.helmetBuyPrice }),
    },
  ];

  return (
    <div className="space-y-2">
      {/* The free helmet is a benefit, not a choice — it never sits inside the
          paid options, and it uses a real photo so it cannot read as "wear a
          helmet" or "put a helmet on the bike". */}
      <BenefitBlock
        image={helmetImage}
        title={t("freeWithBikeTitle")}
        body={t("helmetIncludedNote")}
      />

      <div className="rounded-2xl border border-primary/30 bg-card/70 p-3">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <ShieldCheck className="h-4 w-4 text-primary" />
        {t("helmetExtraTitle")}
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground">{t("helmetExtraHint")}</p>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {options.map((option) => (
          <button
            key={option.mode}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option.mode)}
            className={cn(
              "rounded-xl border px-2 py-2 text-left transition-colors disabled:opacity-60",
              value === option.mode
                ? "border-primary bg-primary/10 ring-1 ring-primary"
                : "border-border bg-background/60 hover:border-primary/50",
            )}
          >
            <span className="block text-xs font-semibold">{option.label}</span>
            {option.hint ? (
              <span className="mt-0.5 block text-[10px] leading-tight text-muted-foreground">
                {option.hint}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {value === "RENT" && rentAmount > 0 && (
        <p className="mt-2 flex justify-between gap-3 text-xs">
          <span className="text-muted-foreground">{t("lineHelmetRent")}</span>
          <span className="font-semibold">{rupees(rentAmount)}</span>
        </p>
      )}
      {value === "BUY" && (
        <p className="mt-2 flex justify-between gap-3 text-xs">
          <span className="text-muted-foreground">{t("lineHelmetBuy")}</span>
          <span className="font-semibold">{rupees(rates.helmetBuyPrice)}</span>
        </p>
      )}
      </div>
    </div>
  );
}
