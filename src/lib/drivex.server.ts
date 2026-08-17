import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/** Publishable-key client for public catalogue reads during SSR. */
export function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

export const ALLOWED_EVENTS = [
  "app_opened",
  "location_shared",
  "hub_viewed",
  "bike_viewed",
  "bike_selected",
  "plan_selected",
  "mobile_verified",
  "eligibility_started",
  "eligibility_skipped",
  "eligibility_completed",
  "reservation_started",
  "reservation_paid",
  "rapido_selected",
  "self_travel_selected",
  "hub_checkin",
  "kyc_started",
  "kyc_approved",
  "kyc_rejected",
  "final_payment_started",
  "final_payment_completed",
  "agreement_accepted",
  "vehicle_handed_over",
  "rental_activated",
] as const;

export type FunnelEvent = (typeof ALLOWED_EVENTS)[number];

export async function track(
  event: FunnelEvent,
  props: Record<string, unknown> = {},
  ids: { customerId?: string | null; bookingId?: string | null } = {},
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("analytics_events").insert({
    event,
    props: props as never,
    customer_id: ids.customerId ?? null,
    booking_id: ids.bookingId ?? null,
  });
}
/**
 * Indian DL numbers are written many ways (KA01 20150001234, KA-01-2015-0001234,
 * DL1420110012345). Accept any state code + 11-14 alphanumerics after cleaning.
 */
export function isLikelyDl(value: string): boolean {
  const dl = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return /^[A-Z]{2}[0-9A-Z]{11,14}$/.test(dl);
}
