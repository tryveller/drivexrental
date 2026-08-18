import { CalendarDays, Clock } from "lucide-react";

import type { CatalogPlan } from "@/lib/catalog.functions";
import {
  SLOTS,
  buildQuote,
  computeDuration,
  lateReturnFee,
  meetsMinDuration,
  minDurationDays,
  type AddonRates,
  type HelmetMode,
} from "@/lib/pricing";
import { rupees } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useLanguage, type TKey } from "@/lib/i18n";
import { HelmetPicker } from "./HelmetPicker";

export type RideDates = {
  pickupOn: string;
  pickupSlot: string;
  dropoffOn: string;
  dropoffSlot: string;
};

export function todayIso(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

export function defaultDates(): RideDates {
  const today = todayIso();
  const tomorrow = new Date(`${today}T00:00:00`);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return {
    pickupOn: today,
    pickupSlot: "MORNING",
    dropoffOn: tomorrow.toISOString().slice(0, 10),
    dropoffSlot: "EVENING",
  };
}

function SlotRow({
  value,
  onChange,
}: {
  value: string;
  onChange: (slot: string) => void;
}) {
  const { t } = useLanguage();
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {SLOTS.map((slot) => (
        <button
          key={slot.key}
          type="button"
          onClick={() => onChange(slot.key)}
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
            value === slot.key
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card/70 text-muted-foreground hover:border-primary/50",
          )}
        >
          {t(slot.labelKey as TKey)}
        </button>
      ))}
    </div>
  );
}

export function DatesStep({
  plan,
  value,
  onChange,
  rates,
  helmet,
  onHelmetChange,
}: {
  plan: CatalogPlan;
  value: RideDates;
  onChange: (next: RideDates) => void;
  rates: AddonRates;
  helmet: HelmetMode;
  onHelmetChange: (mode: HelmetMode) => void;
}) {
  const { t } = useLanguage();
  const duration = computeDuration(
    value.pickupOn,
    value.pickupSlot,
    value.dropoffOn,
    value.dropoffSlot,
  );
  const quote = buildQuote(plan, duration, { mode: helmet, rates });
  const minDays = minDurationDays(plan);
  const durationTooShort = duration !== null && !meetsMinDuration(plan, duration);
  const chargeLines = quote.atHub.filter((line) => line.labelKey !== "lineDeposit");

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold">{t("datesTitle")}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t("datesHint")}</p>
      </div>

      <div className="rounded-2xl border border-border bg-card/70 p-3">
        <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5 text-primary" />
          {t("pickupDateLabel")}
        </label>
        <input
          type="date"
          value={value.pickupOn}
          min={todayIso()}
          onChange={(event) => onChange({ ...value, pickupOn: event.target.value })}
          className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
        />
        <p className="mt-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Clock className="h-3.5 w-3.5 text-primary" />
          {t("pickupTimeLabel")}
        </p>
        <SlotRow value={value.pickupSlot} onChange={(slot) => onChange({ ...value, pickupSlot: slot })} />
      </div>

      <div className="rounded-2xl border border-border bg-card/70 p-3">
        <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5 text-primary" />
          {t("dropoffDateLabel")}
        </label>
        <input
          type="date"
          value={value.dropoffOn}
          min={value.pickupOn}
          onChange={(event) => onChange({ ...value, dropoffOn: event.target.value })}
          className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
        />
        <p className="mt-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Clock className="h-3.5 w-3.5 text-primary" />
          {t("dropoffTimeLabel")}
        </p>
        <SlotRow
          value={value.dropoffSlot}
          onChange={(slot) => onChange({ ...value, dropoffSlot: slot })}
        />
      </div>

      {duration === null ? (
        <p className="rounded-2xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs">
          {t("dropoffAfterPickup")}
        </p>
      ) : durationTooShort ? (
        <p className="rounded-2xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs">
          {t("minDurationError", { days: minDays })}
        </p>
      ) : (
        <>
        <HelmetPicker
          plan={plan}
          duration={duration}
          rates={rates}
          value={helmet}
          onChange={onHelmetChange}
        />
        <div className="rounded-2xl border border-primary/40 bg-primary/10 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t("daysBilledLabel")}</span>
            <span className="font-medium">
              {duration.extraHours > 0
                ? t("daysAndHours", { days: duration.days, hours: duration.extraHours })
                : t("lineRentDays", { days: duration.days })}
            </span>
          </div>

          <dl className="mt-2 space-y-1.5 text-sm">
            {chargeLines.map((line) => (
              <div key={line.labelKey} className="flex justify-between gap-4">
                <dt className="text-muted-foreground">
                  {t(line.labelKey as TKey, line.labelVars)}
                </dt>
                <dd className="font-medium">{rupees(line.amount)}</dd>
              </div>
            ))}
            <div className="flex justify-between gap-4 border-t border-primary/20 pt-1.5">
              <dt className="font-medium">{t("rentChargesLabel")}</dt>
              <dd className="font-semibold">{rupees(quote.chargesTotal)}</dd>
            </div>
            {quote.depositAmount > 0 && (
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">{t("depositRefundableLabel")}</dt>
                <dd className="font-medium">{rupees(quote.depositAmount)}</dd>
              </div>
            )}
          </dl>

          <div className="mt-3 flex items-baseline justify-between border-t border-primary/30 pt-3">
            <span className="text-sm font-semibold">{t("totalToPay")}</span>
            <span className="text-xl font-semibold">{rupees(quote.totalInitialLiability)}</span>
          </div>
          {quote.perDay !== null && (
            <p className="mt-1 text-right text-xs text-primary">
              {t("perDayApprox", { amount: rupees(quote.perDay) })}
            </p>
          )}
          {quote.depositAmount > 0 && (
            <p className="mt-2 text-[11px] text-muted-foreground">{t("depositRefundableNote")}</p>
          )}

          <p className="mt-3 rounded-xl bg-background/70 px-3 py-2 text-[11px] text-muted-foreground">
            {t("reserveNote", {
              reserve: rupees(quote.payNow),
              total: rupees(quote.totalInitialLiability),
              remaining: rupees(quote.amountAtHub),
            })}
          </p>
          {duration.extraHours > 0 && (
            <p className="mt-2 text-[11px] text-muted-foreground">{t("hoursProrataNote")}</p>
          )}
          <p className="mt-1 text-[11px] text-muted-foreground">
            {t("lateReturnNote", { amount: rupees(lateReturnFee(plan)) })}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">{t("bikeReadyNote")}</p>
        </div>
        </>
      )}
    </div>
  );
}
