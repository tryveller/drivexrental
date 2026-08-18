// Pure, isomorphic commercial calculations. All values come from plan
// configuration rows in the database — nothing here is a hard-coded price.

export type PlanType = "DAILY" | "WEEKLY" | "MONTHLY" | "RTO";

export type PlanConfig = {
  id: string;
  plan_type: PlanType;
  billing_period: string;
  rental_amount: number;
  deposit_amount: number;
  downpayment_amount: number;
  processing_fee: number;
  included_km: number;
  extra_km_rate: number;
  reservation_amount: number;
  late_fee_per_day: number;
  vehicle_condition: "NEW" | "REFURBISHED";
  rto_total_months: number | null;
  late_return_fee?: number;
  minimum_duration_days?: number | null;
};

// Labels are copy keys (resolved through i18n at render time), never English
// strings, so every amount line reads in the rider's language.
export type QuoteLine = {
  labelKey: string;
  labelVars?: Record<string, string | number>;
  amount: number;
};

export type Quote = {
  payNow: number;
  atHub: QuoteLine[];
  reservationCredit: number;
  amountAtHub: number;
  totalInitialLiability: number;
  /** Billed whole days, when the rider has chosen dates. */
  days: number | null;
  /** Hours beyond the whole days, billed pro-rata. */
  extraHours: number;
  /** Rent portion for the chosen duration. */
  rentAmount: number;
  /** Rent ÷ billed days (the refundable deposit is excluded). */
  perDay: number | null;
  /** Amount charged for the optional extra helmet (0 when none). */
  helmetAmount: number;
  /** Refundable security deposit inside `totalInitialLiability`. */
  depositAmount: number;
  /** Everything that is actually a charge: total minus the refundable deposit. */
  chargesTotal: number;
};

// ---------------------------------------------------------------------------
// Helmet add-on. One helmet always ships free with the bike and comes back
// with it; a rider may rent or buy exactly one extra. Every rate is read from
// the addon_pricing table — the fallbacks below only guard a failed fetch.
// ---------------------------------------------------------------------------

export type HelmetMode = "NONE" | "RENT" | "BUY";

export type AddonRates = {
  helmetDailyRate: number;
  helmetMonthlyRate: number;
  helmetBuyPrice: number;
  helmetsIncluded: number;
};

export const ADDON_RATE_FALLBACK: AddonRates = {
  helmetDailyRate: 10,
  helmetMonthlyRate: 100,
  helmetBuyPrice: 1000,
  helmetsIncluded: 1,
};

export function addonRates(rows: { code: string; amount: number }[] | null | undefined): AddonRates {
  const value = (code: string, fallback: number) =>
    rows?.find((row) => row.code === code)?.amount ?? fallback;
  return {
    helmetDailyRate: value("helmet_daily_rate", ADDON_RATE_FALLBACK.helmetDailyRate),
    helmetMonthlyRate: value("helmet_monthly_rate", ADDON_RATE_FALLBACK.helmetMonthlyRate),
    helmetBuyPrice: value("helmet_buy_price", ADDON_RATE_FALLBACK.helmetBuyPrice),
    helmetsIncluded: value("helmets_included", ADDON_RATE_FALLBACK.helmetsIncluded),
  };
}

export function isHelmetMode(value: unknown): value is HelmetMode {
  return value === "NONE" || value === "RENT" || value === "BUY";
}

/** Monthly plans rent the helmet by the month; shorter plans by the day. */
export function helmetCharge(
  plan: Pick<PlanConfig, "plan_type">,
  duration: RideDuration | null | undefined,
  mode: HelmetMode,
  rates: AddonRates,
): number {
  if (mode === "NONE") return 0;
  if (mode === "BUY") return rates.helmetBuyPrice;
  if (plan.plan_type === "MONTHLY" || plan.plan_type === "RTO") {
    const months = duration ? Math.max(1, Math.ceil(duration.days / 30)) : 1;
    return rates.helmetMonthlyRate * months;
  }
  const days = duration
    ? Math.max(1, duration.days + (duration.extraHours > 0 ? 1 : 0))
    : plan.plan_type === "WEEKLY"
      ? 7
      : 1;
  return rates.helmetDailyRate * days;
}

// ---------------------------------------------------------------------------
// Pick-up / drop-off slots. Riders pick a bucket, not an exact minute — it is
// enough for the hub to prepare the bike and keeps the choice mobile-friendly.
// ---------------------------------------------------------------------------

export type SlotKey = "MORNING" | "LATE_MORNING" | "AFTERNOON" | "EVENING";

export const SLOTS: { key: SlotKey; startHour: number; endHour: number; labelKey: string }[] = [
  { key: "MORNING", startHour: 8, endHour: 11, labelKey: "slotMorning" },
  { key: "LATE_MORNING", startHour: 11, endHour: 13, labelKey: "slotLateMorning" },
  { key: "AFTERNOON", startHour: 13, endHour: 16, labelKey: "slotAfternoon" },
  { key: "EVENING", startHour: 16, endHour: 19, labelKey: "slotEvening" },
];

export function slotStartHour(slot: string | null | undefined): number {
  return SLOTS.find((row) => row.key === slot)?.startHour ?? 8;
}

export function slotLabelKey(slot: string | null | undefined): string {
  return SLOTS.find((row) => row.key === slot)?.labelKey ?? "slotMorning";
}

export function isSlotKey(value: unknown): value is SlotKey {
  return SLOTS.some((row) => row.key === value);
}

/** Day rate implied by the plan: weekly ÷ 7, monthly ÷ 30, daily as-is. */
export function planDayRate(plan: Pick<PlanConfig, "plan_type" | "rental_amount">): number {
  if (plan.plan_type === "WEEKLY") return plan.rental_amount / 7;
  if (plan.plan_type === "MONTHLY" || plan.plan_type === "RTO") return plan.rental_amount / 30;
  return plan.rental_amount;
}

/**
 * Shortest booking a plan allows. Weekly and monthly rates are cheaper per day
 * than the daily rate, so without this a 1-day booking on the monthly plan
 * would undercut the daily plan.
 */
export function minDurationDays(
  plan: Pick<PlanConfig, "plan_type" | "minimum_duration_days">,
): number {
  const configured = plan.minimum_duration_days;
  if (typeof configured === "number" && configured > 0) return configured;
  if (plan.plan_type === "WEEKLY") return 7;
  if (plan.plan_type === "MONTHLY" || plan.plan_type === "RTO") return 30;
  return 1;
}

/** True when the chosen dates satisfy the plan's minimum duration. */
export function meetsMinDuration(
  plan: Pick<PlanConfig, "plan_type" | "minimum_duration_days">,
  duration: RideDuration | null | undefined,
): boolean {
  if (!duration) return false;
  const billable = duration.days + (duration.extraHours > 0 ? 1 : 0);
  return billable >= minDurationDays(plan);
}

export type RideDuration = { days: number; extraHours: number; totalHours: number };

/**
 * Exact duration between the chosen pick-up and drop-off slots. Whole days are
 * billed at the plan day rate; the leftover hours are billed pro-rata, so a
 * rider who returns a few hours late never pays for a whole extra day.
 */
export function computeDuration(
  pickupOn: string | null | undefined,
  pickupSlot: string | null | undefined,
  dropoffOn: string | null | undefined,
  dropoffSlot: string | null | undefined,
): RideDuration | null {
  if (!pickupOn || !dropoffOn) return null;
  const start = new Date(`${pickupOn}T00:00:00`);
  start.setHours(slotStartHour(pickupSlot));
  const end = new Date(`${dropoffOn}T00:00:00`);
  end.setHours(slotStartHour(dropoffSlot));
  const hours = Math.round((end.getTime() - start.getTime()) / 3_600_000);
  if (hours <= 0) return null;
  // Anything up to 24 hours is one day; beyond that, whole days plus hours.
  const days = Math.max(1, Math.floor(hours / 24));
  const extraHours = Math.max(0, hours - days * 24);
  return { days, extraHours, totalHours: hours };
}

export function buildQuote(
  plan: PlanConfig,
  duration?: RideDuration | null,
  helmet?: { mode: HelmetMode; rates?: AddonRates; amount?: number } | null,
): Quote {
  const reservation = plan.reservation_amount;
  const lines: QuoteLine[] = [];
  let rentAmount = plan.rental_amount;
  let depositAmount = 0;

  if (plan.plan_type === "RTO") {
    if (plan.downpayment_amount > 0) {
      lines.push({ labelKey: "lineDownpayment", amount: plan.downpayment_amount });
    }
    if (plan.processing_fee > 0) {
      lines.push({ labelKey: "lineProcessingFee", amount: plan.processing_fee });
    }
    if (plan.rental_amount > 0) {
      lines.push({ labelKey: "lineFirstMonthly", amount: plan.rental_amount });
    }
  } else if (duration) {
    const rate = planDayRate(plan);
    const dayPart = Math.round(rate * duration.days);
    const hourPart = Math.round((rate / 24) * duration.extraHours);
    rentAmount = dayPart + hourPart;
    lines.push({
      labelKey: "lineRentDays",
      labelVars: { days: duration.days },
      amount: dayPart,
    });
    if (hourPart > 0) {
      lines.push({
        labelKey: "lineRentExtraHours",
        labelVars: { hours: duration.extraHours },
        amount: hourPart,
      });
    }
    if (plan.deposit_amount > 0) {
      lines.push({ labelKey: "lineDeposit", amount: plan.deposit_amount });
      depositAmount = plan.deposit_amount;
    }
  } else {
    lines.push({
      labelKey: "lineFirstRent",
      labelVars: { period: plan.billing_period },
      amount: plan.rental_amount,
    });
    if (plan.deposit_amount > 0) {
      lines.push({ labelKey: "lineDeposit", amount: plan.deposit_amount });
      depositAmount = plan.deposit_amount;
    }
  }

  const helmetMode = helmet?.mode ?? "NONE";
  const helmetAmount =
    helmetMode === "NONE"
      ? 0
      : typeof helmet?.amount === "number"
        ? helmet.amount
        : helmetCharge(plan, duration ?? null, helmetMode, helmet?.rates ?? ADDON_RATE_FALLBACK);
  if (helmetAmount > 0) {
    lines.push({
      labelKey: helmetMode === "BUY" ? "lineHelmetBuy" : "lineHelmetRent",
      amount: helmetAmount,
    });
  }

  const totalInitialLiability = lines.reduce((sum, line) => sum + line.amount, 0);

  return {
    payNow: reservation,
    atHub: lines,
    reservationCredit: reservation,
    amountAtHub: totalInitialLiability - reservation,
    totalInitialLiability,
    days: duration?.days ?? null,
    extraHours: duration?.extraHours ?? 0,
    rentAmount,
    perDay: duration
      ? Math.round(rentAmount / (duration.days + duration.extraHours / 24))
      : null,
    helmetAmount,
    depositAmount,
    chargesTotal: totalInitialLiability - depositAmount,
  };
}

/** How late a return may be before the configurable late-return fee applies. */
export const LATE_RETURN_FEE_FALLBACK = 50;

export function lateReturnFee(plan: Pick<PlanConfig, "late_return_fee">): number {
  return plan.late_return_fee ?? LATE_RETURN_FEE_FALLBACK;
}

/** Reserved bikes are held for the rider: one pick-up change, up to 3 days later. */
export const MAX_PICKUP_CHANGES = 1;
export const MAX_PICKUP_SHIFT_DAYS = 3;

export const OTHER_POSSIBLE_CHARGE_KEYS = [
  "chargeExtraKm",
  "chargeLateFee",
  "chargeChallan",
  "chargeDamage",
  "chargeProcessing",
  "chargeOther",
] as const;

export type KmUsage = {
  usedKm: number;
  includedKm: number;
  remainingKm: number;
  overKm: number;
  overageAmount: number;
  percentUsed: number;
};

export function computeKmUsage(
  odometer: number,
  periodStartOdometer: number,
  plan: Pick<PlanConfig, "included_km" | "extra_km_rate">,
): KmUsage {
  const usedKm = Math.max(0, odometer - periodStartOdometer);
  const includedKm = plan.included_km;
  const overKm = Math.max(0, usedKm - includedKm);
  return {
    usedKm,
    includedKm,
    remainingKm: Math.max(0, includedKm - usedKm),
    overKm,
    overageAmount: Math.round(overKm * Number(plan.extra_km_rate)),
    percentUsed: includedKm > 0 ? Math.min(100, Math.round((usedKm / includedKm) * 100)) : 0,
  };
}

// Service policy is configuration, not app logic: mandatory check every
// SERVICE_INTERVAL_DAYS or SERVICE_INTERVAL_KM, whichever comes first.
export const SERVICE_INTERVAL_DAYS = 14;
export const SERVICE_INTERVAL_KM = 3000;

export type BikeHealth = {
  status: "Good" | "Service Due Soon" | "Service Overdue" | "Attention Required";
  daysToService: number;
  kmToService: number;
  detail: string;
  /** Localisable form of `detail`: a number plus the unit to render. */
  detailValue: number;
  detailUnit: "days" | "km";
};

export function computeBikeHealth(input: {
  odometer: number;
  lastServiceOdometer: number;
  lastServiceDate: string | null;
  hasOpenIssue?: boolean;
}): BikeHealth {
  const kmSinceService = Math.max(0, input.odometer - input.lastServiceOdometer);
  const kmToService = SERVICE_INTERVAL_KM - kmSinceService;
  const lastDate = input.lastServiceDate ? new Date(input.lastServiceDate) : null;
  const daysSince = lastDate
    ? Math.floor((Date.now() - lastDate.getTime()) / 86_400_000)
    : SERVICE_INTERVAL_DAYS;
  const daysToService = SERVICE_INTERVAL_DAYS - daysSince;

  const byDays = daysToService <= kmToService / (SERVICE_INTERVAL_KM / SERVICE_INTERVAL_DAYS);
  const detailValue = Math.abs(byDays ? daysToService : kmToService);
  const detailUnit = byDays ? ("days" as const) : ("km" as const);
  const detail = `${detailValue} ${detailUnit}`;

  if (input.hasOpenIssue) {
    return { status: "Attention Required", daysToService, kmToService, detail, detailValue, detailUnit };
  }
  if (daysToService < 0 || kmToService < 0) {
    return { status: "Service Overdue", daysToService, kmToService, detail, detailValue, detailUnit };
  }
  if (daysToService <= 3 || kmToService <= 250) {
    return { status: "Service Due Soon", daysToService, kmToService, detail, detailValue, detailUnit };
  }
  return { status: "Good", daysToService, kmToService, detail, detailValue, detailUnit };
}

export function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 10) / 10;
}

// Condition score is a rider-facing 0-100 signal derived from real vehicle
// telemetry: odometer, service recency and new/refurbished condition.
export type ConditionScore = {
  score: number;
  labelKey: "condExcellent" | "condVeryGood" | "condGood" | "condFair";
};

export function computeConditionScore(vehicle: {
  odometer_km: number;
  last_service_date: string | null;
  last_service_odometer: number;
  condition: "NEW" | "REFURBISHED";
}): ConditionScore {
  const base = vehicle.condition === "NEW" ? 100 : 92;
  const agePenalty = Math.min(22, vehicle.odometer_km / 1500);
  const kmSinceService = Math.max(0, vehicle.odometer_km - vehicle.last_service_odometer);
  const servicePenalty = Math.min(12, kmSinceService / 300);
  const daysSinceService = vehicle.last_service_date
    ? Math.floor((Date.now() - new Date(vehicle.last_service_date).getTime()) / 86_400_000)
    : 30;
  const freshnessPenalty = Math.min(10, Math.max(0, daysSinceService - 7) / 4);
  const score = Math.max(
    55,
    Math.round(base - agePenalty - servicePenalty - freshnessPenalty),
  );
  const labelKey =
    score >= 92
      ? ("condExcellent" as const)
      : score >= 84
        ? ("condVeryGood" as const)
        : score >= 74
          ? ("condGood" as const)
          : ("condFair" as const);
  return { score, labelKey };
}
