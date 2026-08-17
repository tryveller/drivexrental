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

export type QuoteLine = { label: string; amount: number };

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
      lines.push({ label: "Downpayment", amount: plan.downpayment_amount });
    }
    if (plan.processing_fee > 0) {
      lines.push({ label: "Processing / registration fee", amount: plan.processing_fee });
    }
    if (plan.rental_amount > 0) {
      lines.push({ label: "First monthly payment", amount: plan.rental_amount });
    }
  } else {
    lines.push({
      label: `First ${plan.billing_period} rent`,
      amount: plan.rental_amount,
    });
    if (plan.deposit_amount > 0) {
      lines.push({ label: "Refundable security deposit", amount: plan.deposit_amount });
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

export const OTHER_POSSIBLE_CHARGES = [
  "Extra kilometre charges beyond your plan allowance",
  "Late-payment charges if a rental payment is missed",
  "Traffic challans issued against the vehicle",
  "Damage charges identified at return inspection",
  "Processing / registration charges where applicable",
  "Other charges disclosed in your rental agreement",
];

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