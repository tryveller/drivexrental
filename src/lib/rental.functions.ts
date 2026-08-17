import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyBike = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { computeKmUsage, computeBikeHealth } = await import("./pricing");
    const { supabase, userId } = context;

    const { data: rental } = await supabase
      .from("rentals")
      .select("*")
      .eq("customer_id", userId)
      .eq("status", "ACTIVE")
      .order("created_at", { ascending: false })
      .maybeSingle();

    if (!rental) return null;

    const [vehicleRes, planRes, hubRes] = await Promise.all([
      supabase.from("vehicles").select("*").eq("id", rental.vehicle_id).single(),
      supabase.from("plans").select("*").eq("id", rental.plan_id).single(),
      supabase.from("hubs").select("*").eq("id", rental.return_hub_id ?? "").maybeSingle(),
    ]);

    const vehicle = vehicleRes.data;
    const plan = planRes.data;
    if (!vehicle || !plan) return null;

    const [modelRes, challansRes, servicesRes, inspectionsRes, ledgerRes, paymentsRes] =
      await Promise.all([
        supabase.from("vehicle_models").select("*").eq("id", vehicle.model_id).single(),
        supabase
          .from("challans")
          .select("*")
          .eq("rental_id", rental.id)
          .order("challan_date", { ascending: false }),
        supabase
          .from("service_bookings")
          .select("*")
          .eq("rental_id", rental.id)
          .order("scheduled_on", { ascending: false }),
        supabase.from("inspections").select("*").eq("rental_id", rental.id),
        supabase
          .from("payment_ledger")
          .select("*")
          .eq("customer_id", userId)
          .order("created_at", { ascending: false }),
        supabase
          .from("payments")
          .select("*")
          .eq("customer_id", userId)
          .order("created_at", { ascending: false }),
      ]);

    const { data: handover } = await supabase
      .from("inspections")
      .select("*")
      .eq("booking_id", rental.booking_id)
      .eq("inspection_type", "HANDOVER")
      .maybeSingle();

    const km = computeKmUsage(vehicle.odometer_km, rental.period_start_odometer, {
      included_km: plan.included_km,
      extra_km_rate: Number(plan.extra_km_rate),
    });

    const health = computeBikeHealth({
      odometer: vehicle.odometer_km,
      lastServiceOdometer: vehicle.last_service_odometer,
      lastServiceDate: vehicle.last_service_date,
    });

    const pendingChallans = (challansRes.data ?? []).filter((row) => row.status === "PENDING");

    return {
      rental,
      vehicle,
      plan: { ...plan, extra_km_rate: Number(plan.extra_km_rate) },
      model: modelRes.data,
      hub: hubRes.data,
      km,
      health,
      challans: challansRes.data ?? [],
      services: servicesRes.data ?? [],
      inspections: inspectionsRes.data ?? [],
      handover,
      ledger: ledgerRes.data ?? [],
      payments: paymentsRes.data ?? [],
      dues: {
        rent: rental.next_payment_amount,
        challans: pendingChallans.reduce((sum, row) => sum + row.amount, 0),
        kmOverage: km.overageAmount,
        lateFee: 0,
        damage: 0,
      },
    };
  });

export const payRent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { rentalId: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: rental } = await supabaseAdmin
      .from("rentals")
      .select("*")
      .eq("id", data.rentalId)
      .eq("customer_id", context.userId)
      .single();
    if (!rental) throw new Error("Rental not found");

    const { data: plan } = await supabaseAdmin
      .from("plans")
      .select("*")
      .eq("id", rental.plan_id)
      .single();
    if (!plan) throw new Error("Plan not found");

    const { data: payment } = await supabaseAdmin
      .from("payments")
      .insert({
        booking_id: rental.booking_id,
        customer_id: context.userId,
        amount: rental.next_payment_amount,
        purpose: "RENT",
        status: "SUCCESS",
        method: "UPI",
        paid_at: new Date().toISOString(),
        reference: `SIMUPI${Date.now()}`,
        receipt_no: `RCPT${Math.floor(Math.random() * 900000 + 100000)}`,
      })
      .select("id")
      .single();

    await supabaseAdmin.from("payment_ledger").insert({
      booking_id: rental.booking_id,
      customer_id: context.userId,
      payment_id: payment?.id ?? null,
      entry_type: "RENT",
      amount: rental.next_payment_amount,
      note: `${plan.billing_period === "week" ? "Weekly" : "Monthly"} rental payment`,
    });

    const periodDays = plan.plan_type === "WEEKLY" ? 7 : 30;
    const nextDue = new Date(Date.now() + periodDays * 86_400_000).toISOString().slice(0, 10);

    const { data: vehicle } = await supabaseAdmin
      .from("vehicles")
      .select("odometer_km")
      .eq("id", rental.vehicle_id)
      .single();

    await supabaseAdmin
      .from("rentals")
      .update({
        next_payment_due_on: nextDue,
        period_resets_on: nextDue,
        period_started_on: new Date().toISOString().slice(0, 10),
        period_start_odometer: vehicle?.odometer_km ?? rental.period_start_odometer,
        payments_completed: rental.payments_completed + 1,
      })
      .eq("id", rental.id);

    return { ok: true, amount: rental.next_payment_amount };
  });

export const bookService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { rentalId: string; hubId: string; scheduledOn: string; slot: string }) => input,
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("service_bookings").insert({
      rental_id: data.rentalId,
      customer_id: context.userId,
      hub_id: data.hubId,
      scheduled_on: data.scheduledOn,
      slot: data.slot,
      status: "BOOKED",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const payChallan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { challanId: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: challan } = await supabaseAdmin
      .from("challans")
      .select("*")
      .eq("id", data.challanId)
      .eq("customer_id", context.userId)
      .single();
    if (!challan) throw new Error("Challan not found");

    const { data: payment } = await supabaseAdmin
      .from("payments")
      .insert({
        customer_id: context.userId,
        amount: challan.amount,
        purpose: "CHALLAN",
        status: "SUCCESS",
        method: "UPI",
        paid_at: new Date().toISOString(),
        receipt_no: `RCPT${Math.floor(Math.random() * 900000 + 100000)}`,
      })
      .select("id")
      .single();

    await supabaseAdmin.from("payment_ledger").insert({
      customer_id: context.userId,
      payment_id: payment?.id ?? null,
      entry_type: "CHALLAN",
      amount: challan.amount,
      note: `Traffic challan ${challan.challan_no}`,
    });

    await supabaseAdmin.from("challans").update({ status: "PAID" }).eq("id", challan.id);
    return { ok: true };
  });

export const requestReturn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { rentalId: string; slot: string; hubId: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("rentals")
      .update({ status: "RETURN_REQUESTED", return_slot: data.slot, return_hub_id: data.hubId })
      .eq("id", data.rentalId)
      .eq("customer_id", context.userId);
    await supabaseAdmin
      .from("bookings")
      .update({ status: "RETURN_REQUESTED" })
      .eq("customer_id", context.userId)
      .eq("status", "ACTIVE");
    return { ok: true };
  });

export const completeReturn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { rentalId: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { computeKmUsage } = await import("./pricing");

    const { data: rental } = await supabaseAdmin
      .from("rentals")
      .select("*")
      .eq("id", data.rentalId)
      .eq("customer_id", context.userId)
      .single();
    if (!rental) throw new Error("Rental not found");

    const [{ data: plan }, { data: vehicle }, { data: challans }] = await Promise.all([
      supabaseAdmin.from("plans").select("*").eq("id", rental.plan_id).single(),
      supabaseAdmin.from("vehicles").select("*").eq("id", rental.vehicle_id).single(),
      supabaseAdmin.from("challans").select("*").eq("rental_id", rental.id).eq("status", "PENDING"),
    ]);
    if (!plan || !vehicle) throw new Error("Rental data missing");

    const km = computeKmUsage(vehicle.odometer_km, rental.period_start_odometer, {
      included_km: plan.included_km,
      extra_km_rate: Number(plan.extra_km_rate),
    });
    const challanTotal = (challans ?? []).reduce((sum, row) => sum + row.amount, 0);
    const damageAmount = 300;

    await supabaseAdmin.from("inspections").insert({
      rental_id: rental.id,
      booking_id: rental.booking_id,
      customer_id: context.userId,
      vehicle_id: vehicle.id,
      inspection_type: "RETURN",
      odometer: vehicle.odometer_km,
      fuel_percent: vehicle.fuel_percent,
      accessories: ["Helmet", "2 keys", "Phone holder"],
      photos: [
        { view: "Front", note: "No new damage" },
        { view: "Rear", note: "No new damage" },
        { view: "Left", note: "Scratch on left side panel is deeper than at handover" },
        { view: "Right", note: "No new damage" },
        { view: "Dashboard", note: `Odometer ${vehicle.odometer_km} km` },
      ] as never,
      damages: [
        { area: "Left side panel", note: "Scratch deepened during rental", charge: damageAmount },
      ] as never,
    });

    const refund = Math.max(
      0,
      plan.deposit_amount - challanTotal - km.overageAmount - damageAmount,
    );

    const { data: settlement, error } = await supabaseAdmin
      .from("settlements")
      .insert({
        rental_id: rental.id,
        customer_id: context.userId,
        deposit_amount: plan.deposit_amount,
        outstanding_rent: 0,
        challan_amount: challanTotal,
        km_overage_amount: km.overageAmount,
        damage_amount: damageAmount,
        refund_amount: refund,
        status: "REFUND_PENDING",
        damages: [
          { area: "Left side panel", charge: damageAmount, note: "Compared against handover photo" },
        ] as never,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    await supabaseAdmin
      .from("rentals")
      .update({ status: "CLOSED", ended_at: new Date().toISOString() })
      .eq("id", rental.id);
    await supabaseAdmin.from("bookings").update({ status: "CLOSED" }).eq("id", rental.booking_id);
    await supabaseAdmin
      .from("vehicles")
      .update({ status: "RETURN_INSPECTION" })
      .eq("id", vehicle.id);

    return { settlementId: settlement.id };
  });

export const getReturnPreview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { computeKmUsage } = await import("./pricing");
    const { supabase, userId } = context;

    const { data: rental } = await supabase
      .from("rentals")
      .select("*")
      .eq("customer_id", userId)
      .in("status", ["ACTIVE", "RETURN_REQUESTED"])
      .order("created_at", { ascending: false })
      .maybeSingle();
    if (!rental) return null;

    const [{ data: plan }, { data: vehicle }, { data: challans }, { data: settlement }] =
      await Promise.all([
        supabase.from("plans").select("*").eq("id", rental.plan_id).single(),
        supabase.from("vehicles").select("*").eq("id", rental.vehicle_id).single(),
        supabase.from("challans").select("*").eq("rental_id", rental.id).eq("status", "PENDING"),
        supabase.from("settlements").select("*").eq("rental_id", rental.id).maybeSingle(),
      ]);
    if (!plan || !vehicle) return null;

    const km = computeKmUsage(vehicle.odometer_km, rental.period_start_odometer, {
      included_km: plan.included_km,
      extra_km_rate: Number(plan.extra_km_rate),
    });
    const challanTotal = (challans ?? []).reduce((sum, row) => sum + row.amount, 0);

    return {
      rental,
      deposit: plan.deposit_amount,
      outstandingRent: 0,
      challans: challanTotal,
      kmOverage: km.overageAmount,
      knownPending: challanTotal + km.overageAmount,
      potentialRefund: Math.max(0, plan.deposit_amount - challanTotal - km.overageAmount),
      settlement,
    };
  });