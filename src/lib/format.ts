export function rupees(amount: number): string {
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

export function shortDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function longDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function planLabel(planType: string): string {
  if (planType === "WEEKLY") return "Weekly Rental";
  if (planType === "MONTHLY") return "Monthly Rental";
  return "Rent-to-Own";
}

export function conditionLabel(condition: string): string {
  return condition === "NEW" ? "New" : "Refurbished";
}

export const DRIVEX_SUPPORT_PHONE = "+918000000100";

/** Some model names already include the brand (e.g. "TVS Jupiter"). */
export function modelTitle(brand: string, name: string): string {
  return name.toLowerCase().startsWith(brand.toLowerCase()) ? name : `${brand} ${name}`;
}
export const DRIVEX_WHATSAPP = "918000000100";