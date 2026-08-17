import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ACTIVE_STATUSES = [
  "DISCOVERY",
  "BIKE_SELECTED",
  "OTP_VERIFIED",
  "ELIGIBILITY_STARTED",
  "ELIGIBILITY_COMPLETED",
  "ELIGIBILITY_SKIPPED",
  "PAYMENT_PENDING",
  "RESERVED",
  "TRAVEL_TO_HUB",
  "AT_HUB",
  "KYC_IN_PROGRESS",
  "APPROVED",
  "FINAL_PAYMENT_PENDING",
  "PAID",
  "AGREEMENT_ACCEPTED",
  "VEHICLE_ASSIGNED",
  "HANDOVER_PENDING",
  "ACTIVE",
  "RETURN_REQUESTED",
];

/** Everything the account screen and the header menu need for one rider. */
export const getAccountOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [customerRes, bookingsRes, modelsRes, hubsRes, servicesRes] = await Promise.all([
      supabase.from("customers").select("phone, full_name, locality").eq("id", userId).maybeSingle(),
      supabase
        .from("bookings")
        .select(
          "id, booking_code, status, model_id, hub_id, pickup_on, pickup_slot, dropoff_on, dropoff_slot, quoted_total, created_at",
        )
        .eq("customer_id", userId)
        .order("created_at", { ascending: false }),
      supabase.from("vehicle_models").select("id, brand, name"),
      supabase.from("hubs").select("id, name, locality"),
      supabase
        .from("service_bookings")
        .select("id, scheduled_on, slot, status, work_done, odometer, hub_id")
        .eq("customer_id", userId)
        .order("scheduled_on", { ascending: false }),
    ]);

    const bookings = bookingsRes.data ?? [];
    const models = modelsRes.data ?? [];
    const hubs = hubsRes.data ?? [];

    const decorate = (row: (typeof bookings)[number]) => {
      const model = models.find((entry) => entry.id === row.model_id) ?? null;
      const hub = hubs.find((entry) => entry.id === row.hub_id) ?? null;
      return {
        ...row,
        modelBrand: model?.brand ?? null,
        modelName: model?.name ?? null,
        hubName: hub?.name ?? null,
      };
    };

    return {
      phone: customerRes.data?.phone ?? null,
      fullName: customerRes.data?.full_name ?? null,
      current: bookings.filter((row) => ACTIVE_STATUSES.includes(row.status)).map(decorate),
      past: bookings.filter((row) => !ACTIVE_STATUSES.includes(row.status)).map(decorate),
      services: (servicesRes.data ?? []).map((row) => ({
        ...row,
        hubName: hubs.find((entry) => entry.id === row.hub_id)?.name ?? null,
      })),
    };
  });
