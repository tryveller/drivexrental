import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BOOKING_SELECT =
  "id, booking_code, status, hub_id, model_id, plan_id, vehicle_id, reservation_expires_at, travel_mode, rapido_coupon, checked_in_at, agreement_accepted_at, handover_confirmed_at, rejection_reason, created_at, pickup_on, pickup_slot, dropoff_on, dropoff_slot, billed_days, billed_extra_hours, quoted_total, pickup_change_count, original_pickup_on, extra_helmet_mode, extra_helmet_amount";

const LOCKED_STATUSES = [
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
];

export const createBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      modelId: string;
      hubId: string;
      planId: string;
      pickupOn?: string;
      pickupSlot?: string;
      dropoffOn?: string;
      dropoffSlot?: string;
      extraHelmet?: string;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { track } = await import("./drivex.server");
    const { addonRates, buildQuote, computeDuration, isHelmetMode, isSlotKey, meetsMinDuration, minDurationDays } =
      await import("./pricing");

    // The server owns the quote: dates come from the rider, amounts never do.
    const pickupSlot = isSlotKey(data.pickupSlot) ? data.pickupSlot : "MORNING";
    const dropoffSlot = isSlotKey(data.dropoffSlot) ? data.dropoffSlot : "EVENING";
    const helmetMode = isHelmetMode(data.extraHelmet) ? data.extraHelmet : "NONE";
    const duration = computeDuration(
      data.pickupOn ?? null,
      pickupSlot,
      data.dropoffOn ?? null,
      dropoffSlot,
    );

    // Helmet rates and plan amounts both come from the database.
    const [{ data: plan }, { data: addonRows }] = await Promise.all([
      supabaseAdmin.from("plans").select("*").eq("id", data.planId).single(),
      supabaseAdmin.from("addon_pricing").select("code, amount").eq("is_active", true),
    ]);
    const helmet = { mode: helmetMode, rates: addonRates(addonRows) };
    // The plan's minimum duration is enforced here too: weekly/monthly day
    // rates are lower than the daily rate, so a short booking on them would
    // otherwise undercut the daily plan.
    if (plan && plan.plan_type !== "RTO" && duration && !meetsMinDuration(plan, duration)) {
      throw new Error(
        `This plan needs at least ${minDurationDays(plan)} days. Please pick a later drop-off date.`,
      );
    }
    const quote = plan
      ? buildQuote({ ...plan, extra_km_rate: Number(plan.extra_km_rate) }, duration, helmet)
      : null;

    let dateFields: Record<string, unknown> = {
      extra_helmet_mode: helmetMode,
      extra_helmet_amount: quote?.helmetAmount ?? 0,
    };
    if (duration && data.pickupOn && data.dropoffOn) {
      dateFields = {
        ...dateFields,
        pickup_on: data.pickupOn,
        pickup_slot: pickupSlot,
        dropoff_on: data.dropoffOn,
        dropoff_slot: dropoffSlot,
        billed_days: duration.days,
        billed_extra_hours: duration.extraHours,
        quoted_total: quote?.totalInitialLiability ?? null,
        original_pickup_on: data.pickupOn,
        pickup_change_count: 0,
      };
    }

    const { data: open } = await supabaseAdmin
      .from("bookings")
      .select("id, status")
      .eq("customer_id", context.userId)
      .not("status", "in", "(CLOSED,REJECTED)")
      .order("created_at", { ascending: false })
      .limit(1);

    const current = open?.[0];
    if (current && LOCKED_STATUSES.includes(current.status)) {
      return { bookingId: current.id, existing: true };
    }

    if (current) {
      const { data: updated, error } = await supabaseAdmin
        .from("bookings")
        .update({
          model_id: data.modelId,
          hub_id: data.hubId,
          plan_id: data.planId,
          status: "OTP_VERIFIED",
          ...dateFields,
        })
        .eq("id", current.id)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return { bookingId: updated.id, existing: false };
    }

    const { data: inserted, error } = await supabaseAdmin
      .from("bookings")
      .insert({
        customer_id: context.userId,
        model_id: data.modelId,
        hub_id: data.hubId,
        plan_id: data.planId,
        status: "OTP_VERIFIED",
        ...dateFields,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    await track(
      "plan_selected",
      { planId: data.planId },
      { customerId: context.userId, bookingId: inserted.id },
    );
    return { bookingId: inserted.id, existing: false };
  });

export const getJourney = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input?: { bookingId?: string } | undefined) => input ?? {})
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    let query = supabase
      .from("bookings")
      .select(BOOKING_SELECT)
      .eq("customer_id", userId);
    if (data.bookingId) query = query.eq("id", data.bookingId);
    const { data: bookings } = await query.order("created_at", { ascending: false });

    const rows = bookings ?? [];
    // A rider can have older, finished bookings created after an in-progress one
    // (e.g. a hub-side reservation). Always resume the live booking first.
    const booking =
      rows.find((row) => !["CLOSED", "REJECTED", "CANCELLED"].includes(row.status)) ??
      rows[0] ??
      null;
    const { data: customer } = await supabase
      .from("customers")
      .select("id, phone, full_name")
      .eq("id", userId)
      .maybeSingle();

    if (!booking) {
      return { booking: null, kyc: null, payments: [], rental: null, customer };
    }

    const [kyc, payments, rental] = await Promise.all([
      supabase.from("kyc_cases").select("*").eq("booking_id", booking.id).maybeSingle(),
      supabase
        .from("payments")
        .select("id, amount, purpose, status, method, paid_at, receipt_no, created_at")
        .eq("customer_id", userId)
        .order("created_at", { ascending: false }),
      supabase.from("rentals").select("id, status").eq("booking_id", booking.id).maybeSingle(),
    ]);

    return {
      booking,
      kyc: kyc.data,
      payments: payments.data ?? [],
      rental: rental.data,
      customer,
    };
  });

const HELMET_EDITABLE_STATUSES = [
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
];

/** Riders may still add or drop the extra helmet at the hub, until payment. */
export const setExtraHelmet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { bookingId: string; mode: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { addonRates, buildQuote, computeDuration, isHelmetMode } = await import("./pricing");
    const mode = isHelmetMode(data.mode) ? data.mode : "NONE";

    const { data: booking } = await supabaseAdmin
      .from("bookings")
      .select("id, status, plan_id, pickup_on, pickup_slot, dropoff_on, dropoff_slot")
      .eq("id", data.bookingId)
      .eq("customer_id", context.userId)
      .single();
    if (!booking) throw new Error("Booking not found");
    if (!HELMET_EDITABLE_STATUSES.includes(booking.status)) {
      throw new Error("The helmet choice can no longer be changed for this booking.");
    }

    const [{ data: plan }, { data: addonRows }] = await Promise.all([
      supabaseAdmin.from("plans").select("*").eq("id", booking.plan_id).single(),
      supabaseAdmin.from("addon_pricing").select("code, amount").eq("is_active", true),
    ]);
    if (!plan) throw new Error("Plan not found");

    const duration = computeDuration(
      booking.pickup_on,
      booking.pickup_slot,
      booking.dropoff_on,
      booking.dropoff_slot,
    );
    const quote = buildQuote({ ...plan, extra_km_rate: Number(plan.extra_km_rate) }, duration, {
      mode,
      rates: addonRates(addonRows),
    });

    await supabaseAdmin
      .from("bookings")
      .update({
        extra_helmet_mode: mode,
        extra_helmet_amount: quote.helmetAmount,
        ...(booking.pickup_on ? { quoted_total: quote.totalInitialLiability } : {}),
      })
      .eq("id", booking.id);

    return { mode, amount: quote.helmetAmount, total: quote.totalInitialLiability };
  });

export const submitEligibility = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      bookingId: string;
      selfieCaptured: boolean;
      selfiePath?: string | null;
      dlFrontPath?: string | null;
      dlBackPath?: string | null;
      consent: boolean;
      method: "DIGITAL" | "UPLOAD";
    }) => input,
  )
  .handler(async ({ data, context }) => {
    if (!data.consent) throw new Error("We need your consent to run the eligibility check.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { track } = await import("./drivex.server");
    const { persistDocuments } = await import("./documents.server");
    const { CONSENT_TEXT, CONSENT_VERSION } = await import("./consent");

    // One scoring rule for booking-time and standalone self-checks.
    const { evaluateEligibility } = await import("./eligibility");
    const result = evaluateEligibility(data);

    await supabaseAdmin.from("kyc_cases").upsert(
      {
        booking_id: data.bookingId,
        customer_id: context.userId,
        status: "SUBMITTED",
        dl_verified: false,
        selfie_captured: data.selfieCaptured,
        selfie_path: data.selfiePath ?? null,
        dl_front_path: data.dlFrontPath ?? null,
        dl_back_path: data.dlBackPath ?? null,
        eligibility_result: result,
        consent_version: CONSENT_VERSION,
        consent_text: CONSENT_TEXT,
        consent_at: new Date().toISOString(),
        consent_device: "rider-app",
      },
      { onConflict: "booking_id" },
    );

    await persistDocuments(supabaseAdmin, context.userId, {
      "dl-front": data.dlFrontPath,
      "dl-back": data.dlBackPath,
      selfie: data.selfiePath,
    });

    await supabaseAdmin
      .from("bookings")
      .update({ status: "ELIGIBILITY_COMPLETED" })
      .eq("id", data.bookingId)
      .eq("customer_id", context.userId);

    await track(
      "eligibility_completed",
      { result },
      { customerId: context.userId, bookingId: data.bookingId },
    );

    return { result };
  });

export const skipEligibility = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { bookingId: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { track } = await import("./drivex.server");
    await supabaseAdmin
      .from("bookings")
      .update({ status: "ELIGIBILITY_SKIPPED" })
      .eq("id", data.bookingId)
      .eq("customer_id", context.userId);
    await track("eligibility_skipped", {}, {
      customerId: context.userId,
      bookingId: data.bookingId,
    });
    return { ok: true };
  });

export const payReservation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { bookingId: string; method?: string; acceptedTerms: boolean }) => input,
  )
  .handler(async ({ data, context }) => {
    if (!data.acceptedTerms) {
      throw new Error("Please accept the reservation terms before paying.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { track } = await import("./drivex.server");
    const { RESERVATION_TERMS_TEXT, RESERVATION_TERMS_VERSION } = await import("./consent");

    const { data: booking } = await supabaseAdmin
      .from("bookings")
      .select("id, status, hub_id, model_id, plan_id, vehicle_id, pickup_on, pickup_slot")
      .eq("id", data.bookingId)
      .eq("customer_id", context.userId)
      .single();
    if (!booking) throw new Error("Booking not found");

    const { data: plan } = await supabaseAdmin
      .from("plans")
      .select("reservation_amount")
      .eq("id", booking.plan_id)
      .single();
    const { RESERVATION_FALLBACK, reservationHoldUntil } = await import("./pricing");
    const amount = plan?.reservation_amount ?? RESERVATION_FALLBACK;

    const { data: alreadyPaid } = await supabaseAdmin
      .from("payments")
      .select("id")
      .eq("booking_id", booking.id)
      .eq("purpose", "RESERVATION")
      .eq("status", "SUCCESS")
      .maybeSingle();
    if (alreadyPaid) return { ok: true, alreadyPaid: true };

    let vehicleId = booking.vehicle_id;
    if (!vehicleId) {
      const { data: vehicle } = await supabaseAdmin
        .from("vehicles")
        .select("id")
        .eq("hub_id", booking.hub_id)
        .eq("model_id", booking.model_id)
        .in("status", ["AVAILABLE", "READY_FOR_RENT"])
        .limit(1)
        .maybeSingle();
      if (!vehicle)
        throw new Error(
          "This bike was just taken at that hub. Please pick another bike or hub — you have not been charged.",
        );
      vehicleId = vehicle.id;
    }

    const { data: payment, error: payErr } = await supabaseAdmin
      .from("payments")
      .insert({
        booking_id: booking.id,
        customer_id: context.userId,
        amount,
        purpose: "RESERVATION",
        status: "INITIATED",
        method: data.method ?? "UPI",
      })
      .select("id")
      .single();
    if (payErr) throw new Error(payErr.message);

    // Simulated gateway callback: only the server confirms the payment.
    await supabaseAdmin
      .from("payments")
      .update({
        status: "SUCCESS",
        paid_at: new Date().toISOString(),
        reference: `SIMUPI${Date.now()}`,
        receipt_no: `RCPT${Math.floor(Math.random() * 900000 + 100000)}`,
      })
      .eq("id", payment.id);

    await supabaseAdmin.from("payment_ledger").insert({
      booking_id: booking.id,
      customer_id: context.userId,
      payment_id: payment.id,
      entry_type: "RESERVATION",
      amount,
      note: `₹${amount} reservation — adjusted against the amount due at the hub`,
    });

    await supabaseAdmin.from("vehicles").update({ status: "RESERVED" }).eq("id", vehicleId);

    await supabaseAdmin
      .from("bookings")
      .update({
        status: "RESERVED",
        vehicle_id: vehicleId,
        reservation_terms_version: RESERVATION_TERMS_VERSION,
        reservation_terms_text: RESERVATION_TERMS_TEXT,
        reservation_terms_at: new Date().toISOString(),
        reservation_expires_at: reservationHoldUntil(
          new Date(),
          booking.pickup_on,
          booking.pickup_slot,
        ).toISOString(),
      })
      .eq("id", booking.id);

    await supabaseAdmin.from("kyc_cases").upsert(
      { booking_id: booking.id, customer_id: context.userId },
      { onConflict: "booking_id", ignoreDuplicates: true },
    );

    await track("reservation_paid", { amount }, {
      customerId: context.userId,
      bookingId: booking.id,
    });

    return { ok: true, alreadyPaid: false };
  });

export const changePickupDate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { bookingId: string; pickupOn: string; pickupSlot?: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const {
      MAX_PICKUP_CHANGES,
      MAX_PICKUP_SHIFT_DAYS,
      addonRates,
      addDaysIso,
      buildQuote,
      computeDuration,
      daysBetweenIso,
      isHelmetMode,
      isSlotKey,
      reservationHoldUntil,
    } = await import("./pricing");

    const { data: booking } = await supabaseAdmin
      .from("bookings")
      .select(
        "id, plan_id, pickup_on, pickup_slot, original_pickup_on, pickup_change_count, dropoff_on, dropoff_slot, extra_helmet_mode",
      )
      .eq("id", data.bookingId)
      .eq("customer_id", context.userId)
      .single();
    if (!booking) throw new Error("Booking not found");

    if ((booking.pickup_change_count ?? 0) >= MAX_PICKUP_CHANGES) {
      return { ok: false as const, reason: "USED" as const };
    }

    const base = booking.original_pickup_on ?? booking.pickup_on;
    if (!base) return { ok: false as const, reason: "NO_DATES" as const };

    const limit = new Date(`${base}T00:00:00`);
    limit.setDate(limit.getDate() + MAX_PICKUP_SHIFT_DAYS);
    const next = new Date(`${data.pickupOn}T00:00:00`);
    if (next <= new Date(`${base}T00:00:00`) || next > limit) {
      return { ok: false as const, reason: "TOO_FAR" as const };
    }

    const slot = isSlotKey(data.pickupSlot) ? data.pickupSlot : (booking.pickup_slot ?? "MORNING");

    // The rider keeps the same number of days: the drop-off moves with the
    // pick-up, and the quote is rebuilt by the one pricing engine.
    const shift = booking.pickup_on ? daysBetweenIso(booking.pickup_on, data.pickupOn) : 0;
    const dropoffOn = booking.dropoff_on ? addDaysIso(booking.dropoff_on, shift) : null;
    const duration = computeDuration(data.pickupOn, slot, dropoffOn, booking.dropoff_slot);

    let quoted: { billed_days: number; billed_extra_hours: number; quoted_total: number } | null =
      null;
    if (duration) {
      const [{ data: plan }, { data: addonRows }] = await Promise.all([
        supabaseAdmin.from("plans").select("*").eq("id", booking.plan_id).single(),
        supabaseAdmin.from("addon_pricing").select("code, amount").eq("is_active", true),
      ]);
      if (plan) {
        const quote = buildQuote(
          { ...plan, extra_km_rate: Number(plan.extra_km_rate) },
          duration,
          {
            mode: isHelmetMode(booking.extra_helmet_mode) ? booking.extra_helmet_mode : "NONE",
            rates: addonRates(addonRows),
          },
        );
        quoted = {
          billed_days: duration.days,
          billed_extra_hours: duration.extraHours,
          quoted_total: quote.totalInitialLiability,
        };
      }
    }

    await supabaseAdmin
      .from("bookings")
      .update({
        pickup_on: data.pickupOn,
        pickup_slot: slot,
        ...(dropoffOn ? { dropoff_on: dropoffOn } : {}),
        ...(quoted ?? {}),
        pickup_change_count: (booking.pickup_change_count ?? 0) + 1,
        pickup_changed_at: new Date().toISOString(),
        reservation_expires_at: reservationHoldUntil(new Date(), data.pickupOn, slot).toISOString(),
      })
      .eq("id", booking.id);

    return { ok: true as const };
  });

export const setTravelMode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { bookingId: string; mode: "RAPIDO" | "SELF" }) => input)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { track } = await import("./drivex.server");
    const coupon = data.mode === "RAPIDO" ? "DRIVEX50" : null;
    await supabaseAdmin
      .from("bookings")
      .update({ status: "TRAVEL_TO_HUB", travel_mode: data.mode, rapido_coupon: coupon })
      .eq("id", data.bookingId)
      .eq("customer_id", context.userId);
    await track(data.mode === "RAPIDO" ? "rapido_selected" : "self_travel_selected", {}, {
      customerId: context.userId,
      bookingId: data.bookingId,
    });
    return { coupon };
  });

export const checkInAtHub = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { bookingId: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { track } = await import("./drivex.server");

    const { data: kyc } = await supabaseAdmin
      .from("kyc_cases")
      .select("id")
      .eq("booking_id", data.bookingId)
      .maybeSingle();

    if (kyc) {
      await supabaseAdmin.from("kyc_cases").update({ status: "IN_REVIEW" }).eq("id", kyc.id);
    } else {
      await supabaseAdmin.from("kyc_cases").insert({
        booking_id: data.bookingId,
        customer_id: context.userId,
        status: "IN_REVIEW",
      });
    }

    await supabaseAdmin
      .from("bookings")
      .update({ status: "KYC_IN_PROGRESS", checked_in_at: new Date().toISOString() })
      .eq("id", data.bookingId)
      .eq("customer_id", context.userId);

    await track("hub_checkin", {}, { customerId: context.userId, bookingId: data.bookingId });
    await track("kyc_started", {}, { customerId: context.userId, bookingId: data.bookingId });
    return { ok: true };
  });

export const submitHubKyc = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      bookingId: string;
      selfieCaptured: boolean;
      selfiePath?: string | null;
      dlFrontPath?: string | null;
      dlBackPath?: string | null;
      addressProofPath?: string | null;
      panPath?: string | null;
      consent?: boolean;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    if (!data.consent) throw new Error("We need your consent to verify these documents.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { track } = await import("./drivex.server");
    const { persistDocuments } = await import("./documents.server");
    const { CONSENT_TEXT, CONSENT_VERSION } = await import("./consent");

    // Documents only: nothing is typed, so the only check is that every
    // required capture actually uploaded.
    const missing = [
      !data.dlFrontPath && "licence front",
      !data.dlBackPath && "licence back",
      !data.addressProofPath && "address proof",
      !data.selfiePath && "selfie",
    ].filter(Boolean) as string[];

    if (missing.length > 0) {
      await supabaseAdmin
        .from("kyc_cases")
        .update({
          status: "ACTION_REQUIRED",
          action_required_reason: `Please upload: ${missing.join(", ")}.`,
        })
        .eq("booking_id", data.bookingId);
      return { status: "ACTION_REQUIRED" as const };
    }

    await supabaseAdmin
      .from("kyc_cases")
      .update({
        status: "APPROVED",
        dl_verified: true,
        selfie_captured: true,
        selfie_path: data.selfiePath ?? null,
        dl_front_path: data.dlFrontPath ?? null,
        dl_back_path: data.dlBackPath ?? null,
        address_proof_path: data.addressProofPath ?? null,
        pan_path: data.panPath ?? null,
        consent_version: CONSENT_VERSION,
        consent_text: CONSENT_TEXT,
        consent_at: new Date().toISOString(),
        consent_device: "rider-app",
        address_proof_type: "UPLOAD",
        address_proof_status: "VERIFIED",
        action_required_reason: null,
      })
      .eq("booking_id", data.bookingId);

    await persistDocuments(supabaseAdmin, context.userId, {
      "dl-front": data.dlFrontPath,
      "dl-back": data.dlBackPath,
      "address-proof": data.addressProofPath,
      selfie: data.selfiePath,
      pan: data.panPath,
    });

    await supabaseAdmin
      .from("bookings")
      .update({ status: "FINAL_PAYMENT_PENDING" })
      .eq("id", data.bookingId)
      .eq("customer_id", context.userId);

    await track("kyc_approved", {}, { customerId: context.userId, bookingId: data.bookingId });
    return { status: "APPROVED" as const };
  });

export const getSavedDocuments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { readDocuments } = await import("./documents.server");
    return readDocuments(context.supabase, context.userId);
  });

export const saveDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { docType: string; path: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { persistDocuments, DOC_TYPES } = await import("./documents.server");
    if (!(DOC_TYPES as readonly string[]).includes(data.docType)) {
      throw new Error("Unknown document type");
    }
    await persistDocuments(supabaseAdmin, context.userId, {
      [data.docType]: data.path,
    } as Record<string, string>);
    return { ok: true };
  });

export const getFinalPaymentBreakdown = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { bookingId: string }) => input)
  .handler(async ({ data, context }) => {
    const { addonRates, buildQuote, computeDuration, isHelmetMode } = await import("./pricing");
    const { supabase } = context;

    const { data: booking } = await supabase
      .from("bookings")
      .select(
        "id, plan_id, pickup_on, pickup_slot, dropoff_on, dropoff_slot, extra_helmet_mode",
      )
      .eq("id", data.bookingId)
      .single();
    if (!booking) throw new Error("Booking not found");

    const { data: plan } = await supabase
      .from("plans")
      .select("*")
      .eq("id", booking.plan_id)
      .single();
    if (!plan) throw new Error("Plan not found");

    const { data: ledger } = await supabase
      .from("payment_ledger")
      .select("amount, entry_type")
      .eq("booking_id", booking.id);

    const { data: addonRows } = await supabase
      .from("addon_pricing")
      .select("code, amount")
      .eq("is_active", true);

    const reservationCredit = (ledger ?? [])
      .filter((row) => row.entry_type === "RESERVATION")
      .reduce((sum, row) => sum + row.amount, 0);

    const duration = computeDuration(
      booking.pickup_on,
      booking.pickup_slot,
      booking.dropoff_on,
      booking.dropoff_slot,
    );
    const quote = buildQuote({ ...plan, extra_km_rate: Number(plan.extra_km_rate) }, duration, {
      mode: isHelmetMode(booking.extra_helmet_mode) ? booking.extra_helmet_mode : "NONE",
      rates: addonRates(addonRows),
    });
    return {
      lines: quote.atHub,
      reservationCredit,
      amountDue: quote.totalInitialLiability - reservationCredit,
      totalInitialLiability: quote.totalInitialLiability,
      days: quote.days,
      extraHours: quote.extraHours,
      perDay: quote.perDay,
      helmetAmount: quote.helmetAmount,
      helmetMode: isHelmetMode(booking.extra_helmet_mode) ? booking.extra_helmet_mode : "NONE",
    };
  });

export const payFinalAmount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { bookingId: string; simulateFailure?: boolean }) => input)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { track } = await import("./drivex.server");
    const { addonRates, buildQuote, computeDuration, isHelmetMode } = await import("./pricing");

    const { data: booking } = await supabaseAdmin
      .from("bookings")
      .select(
        "id, plan_id, status, pickup_on, pickup_slot, dropoff_on, dropoff_slot, extra_helmet_mode",
      )
      .eq("id", data.bookingId)
      .eq("customer_id", context.userId)
      .single();
    if (!booking) throw new Error("Booking not found");

    const { data: plan } = await supabaseAdmin
      .from("plans")
      .select("*")
      .eq("id", booking.plan_id)
      .single();
    if (!plan) throw new Error("Plan not found");

    const { data: ledger } = await supabaseAdmin
      .from("payment_ledger")
      .select("amount, entry_type")
      .eq("booking_id", booking.id);

    const { data: addonRows } = await supabaseAdmin
      .from("addon_pricing")
      .select("code, amount")
      .eq("is_active", true);

    const reservationCredit = (ledger ?? [])
      .filter((row) => row.entry_type === "RESERVATION")
      .reduce((sum, row) => sum + row.amount, 0);
    const alreadySettled = (ledger ?? []).some((row) =>
      ["RENT", "SECURITY_DEPOSIT", "RTO_DOWNPAYMENT"].includes(row.entry_type),
    );

    const duration = computeDuration(
      booking.pickup_on,
      booking.pickup_slot,
      booking.dropoff_on,
      booking.dropoff_slot,
    );
    const helmetMode = isHelmetMode(booking.extra_helmet_mode)
      ? booking.extra_helmet_mode
      : "NONE";
    const quote = buildQuote({ ...plan, extra_km_rate: Number(plan.extra_km_rate) }, duration, {
      mode: helmetMode,
      rates: addonRates(addonRows),
    });
    const amountDue = quote.totalInitialLiability - reservationCredit;

    if (alreadySettled) {
      await supabaseAdmin.from("bookings").update({ status: "PAID" }).eq("id", booking.id);
      return { status: "PAID" as const, amount: amountDue };
    }

    await track("final_payment_started", { amountDue }, {
      customerId: context.userId,
      bookingId: booking.id,
    });

    const { data: payment, error: payErr } = await supabaseAdmin
      .from("payments")
      .insert({
        booking_id: booking.id,
        customer_id: context.userId,
        amount: amountDue,
        purpose: plan.plan_type === "RTO" ? "RTO_INITIAL" : "RENT_AND_DEPOSIT",
        status: "INITIATED",
        method: "UPI",
      })
      .select("id")
      .single();
    if (payErr) throw new Error(payErr.message);

    if (data.simulateFailure) {
      await supabaseAdmin.from("payments").update({ status: "FAILED" }).eq("id", payment.id);
      return { status: "FAILED" as const, amount: amountDue };
    }

    await supabaseAdmin
      .from("payments")
      .update({
        status: "SUCCESS",
        paid_at: new Date().toISOString(),
        reference: `SIMUPI${Date.now()}`,
        receipt_no: `RCPT${Math.floor(Math.random() * 900000 + 100000)}`,
      })
      .eq("id", payment.id);

    // Each commercial component is preserved independently in the ledger.
    const entries: { entry_type: string; amount: number; note: string }[] = [];
    if (plan.plan_type === "RTO") {
      if (plan.downpayment_amount > 0)
        entries.push({
          entry_type: "RTO_DOWNPAYMENT",
          amount: plan.downpayment_amount,
          note: "Rent-to-own downpayment",
        });
      if (plan.processing_fee > 0)
        entries.push({
          entry_type: "PROCESSING_FEE",
          amount: plan.processing_fee,
          note: "Processing / registration fee",
        });
      if (plan.rental_amount > 0)
        entries.push({
          entry_type: "RENT",
          amount: plan.rental_amount,
          note: "First monthly payment",
        });
    } else {
      entries.push({
        entry_type: "RENT",
        amount: quote.rentAmount,
        note: duration
          ? `Rent for ${duration.days} day(s)${duration.extraHours ? ` + ${duration.extraHours} hr` : ""}`
          : `First ${plan.billing_period} rent`,
      });
      if (plan.deposit_amount > 0)
        entries.push({
          entry_type: "SECURITY_DEPOSIT",
          amount: plan.deposit_amount,
          note: "Refundable security deposit",
        });
    }

    if (quote.helmetAmount > 0) {
      entries.push({
        entry_type: "HELMET",
        amount: quote.helmetAmount,
        note: helmetMode === "BUY" ? "Extra helmet purchase" : "Extra helmet rental",
      });
    }

    await supabaseAdmin.from("payment_ledger").insert(
      entries.map((entry) => ({
        booking_id: booking.id,
        customer_id: context.userId,
        payment_id: payment.id,
        entry_type: entry.entry_type as never,
        amount: entry.amount,
        note: entry.note,
      })),
    );

    await supabaseAdmin.from("bookings").update({ status: "PAID" }).eq("id", booking.id);
    await track("final_payment_completed", { amount: amountDue }, {
      customerId: context.userId,
      bookingId: booking.id,
    });

    return { status: "PAID" as const, amount: amountDue };
  });

export const acceptAgreement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { bookingId: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { track } = await import("./drivex.server");

    const { data: booking } = await supabaseAdmin
      .from("bookings")
      .select("id, vehicle_id")
      .eq("id", data.bookingId)
      .eq("customer_id", context.userId)
      .single();
    if (!booking?.vehicle_id) throw new Error("No vehicle assigned to this booking yet");

    await supabaseAdmin
      .from("bookings")
      .update({
        status: "HANDOVER_PENDING",
        agreement_accepted_at: new Date().toISOString(),
      })
      .eq("id", booking.id);

    await supabaseAdmin.from("vehicles").update({ status: "ASSIGNED" }).eq("id", booking.vehicle_id);

    const { data: vehicle } = await supabaseAdmin
      .from("vehicles")
      .select("id, odometer_km, fuel_percent")
      .eq("id", booking.vehicle_id)
      .single();

    const { data: existing } = await supabaseAdmin
      .from("inspections")
      .select("id")
      .eq("booking_id", booking.id)
      .eq("inspection_type", "HANDOVER")
      .maybeSingle();

    if (!existing && vehicle) {
      await supabaseAdmin.from("inspections").insert({
        booking_id: booking.id,
        customer_id: context.userId,
        vehicle_id: vehicle.id,
        inspection_type: "HANDOVER",
        odometer: vehicle.odometer_km,
        fuel_percent: vehicle.fuel_percent,
        accessories: ["Helmet", "2 keys", "Phone holder"],
        photos: [
          { view: "Front", note: "No visible damage" },
          { view: "Rear", note: "No visible damage" },
          { view: "Left", note: "Minor scratch on left side panel" },
          { view: "Right", note: "No visible damage" },
          { view: "Dashboard", note: `Odometer ${vehicle.odometer_km} km` },
        ] as never,
        damages: [
          { area: "Left side panel", note: "Existing minor scratch, recorded at handover" },
        ] as never,
        notes: "Condition recorded jointly by DriveX staff and the rider at handover.",
      });
    }

    await track("agreement_accepted", {}, {
      customerId: context.userId,
      bookingId: booking.id,
    });
    return { ok: true };
  });

export const confirmHandover = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { bookingId: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { track } = await import("./drivex.server");

    const { data: booking } = await supabaseAdmin
      .from("bookings")
      .select("id, vehicle_id, plan_id, hub_id")
      .eq("id", data.bookingId)
      .eq("customer_id", context.userId)
      .single();
    if (!booking?.vehicle_id) throw new Error("No vehicle assigned to this booking yet");

    const { data: existing } = await supabaseAdmin
      .from("rentals")
      .select("id")
      .eq("booking_id", booking.id)
      .maybeSingle();
    if (existing) return { rentalId: existing.id };

    const [{ data: plan }, { data: vehicle }] = await Promise.all([
      supabaseAdmin.from("plans").select("*").eq("id", booking.plan_id).single(),
      supabaseAdmin.from("vehicles").select("*").eq("id", booking.vehicle_id).single(),
    ]);
    if (!plan || !vehicle) throw new Error("Vehicle or plan missing");

    const { nextPeriodDate, todayIso } = await import("./pricing");
    const startedOn = todayIso();
    const resetsOn = nextPeriodDate(plan, startedOn);

    const { data: rental, error } = await supabaseAdmin
      .from("rentals")
      .insert({
        booking_id: booking.id,
        customer_id: context.userId,
        vehicle_id: vehicle.id,
        plan_id: plan.id,
        period_start_odometer: vehicle.odometer_km,
        period_started_on: startedOn,
        period_resets_on: resetsOn,
        next_payment_amount: plan.rental_amount,
        next_payment_due_on: resetsOn,
        return_hub_id: booking.hub_id,
        payments_completed: 1,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    await supabaseAdmin
      .from("vehicles")
      .update({
        status: "ACTIVE",
        // Simulated telemetry until the odometer integration is live.
        odometer_km: vehicle.odometer_km + 560,
        telemetry_updated_at: new Date().toISOString(),
      })
      .eq("id", vehicle.id);

    await supabaseAdmin
      .from("bookings")
      .update({ status: "ACTIVE", handover_confirmed_at: new Date().toISOString() })
      .eq("id", booking.id);

    await track("vehicle_handed_over", {}, {
      customerId: context.userId,
      bookingId: booking.id,
    });
    await track("rental_activated", {}, {
      customerId: context.userId,
      bookingId: booking.id,
    });

    return { rentalId: rental.id };
  });