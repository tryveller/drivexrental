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
};

export function buildQuote(plan: PlanConfig): Quote {
  const reservation = plan.reservation_amount;
  const lines: QuoteLine[] = [];

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
  } else {
    lines.push({
      labelKey: "lineFirstRent",
      labelVars: { period: plan.billing_period },
      amount: plan.rental_amount,
    });
    if (plan.deposit_amount > 0) {
      lines.push({ labelKey: "lineDeposit", amount: plan.deposit_amount });
    }
  }

  const totalInitialLiability = lines.reduce((sum, line) => sum + line.amount, 0);

  return {
    payNow: reservation,
    atHub: lines,
    reservationCredit: reservation,
    amountAtHub: totalInitialLiability - reservation,
    totalInitialLiability,
  };
}

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

  const detail =
    daysToService <= kmToService / (SERVICE_INTERVAL_KM / SERVICE_INTERVAL_DAYS)
      ? `${Math.abs(daysToService)} days`
      : `${Math.abs(kmToService)} km`;

  if (input.hasOpenIssue) {
    return { status: "Attention Required", daysToService, kmToService, detail };
  }
  if (daysToService < 0 || kmToService < 0) {
    return { status: "Service Overdue", daysToService, kmToService, detail };
  }
  if (daysToService <= 3 || kmToService <= 250) {
    return { status: "Service Due Soon", daysToService, kmToService, detail };
  }
  return { status: "Good", daysToService, kmToService, detail };
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
