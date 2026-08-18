import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Runs a rider's self-check outside any booking, so anyone can find out where
 * they stand before paying ₹199. The result is indicative only — the hub team
 * makes the final call during KYC.
 */
export const runEligibilityCheck = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      dlFrontPath?: string | null;
      dlBackPath?: string | null;
      selfiePath?: string | null;
      consent: boolean;
      bookingId?: string | null;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    if (!data.consent) throw new Error("We need your consent to run the eligibility check.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { persistDocuments } = await import("./documents.server");
    const { evaluateEligibility } = await import("./eligibility");
    const { CONSENT_TEXT, CONSENT_VERSION } = await import("./consent");
    const { track } = await import("./drivex.server");

    const result = evaluateEligibility(data);

    await supabaseAdmin.from("eligibility_checks").insert({
      customer_id: context.userId,
      booking_id: data.bookingId ?? null,
      result,
      dl_front_path: data.dlFrontPath ?? null,
      dl_back_path: data.dlBackPath ?? null,
      selfie_path: data.selfiePath ?? null,
      consent_version: CONSENT_VERSION,
      consent_text: CONSENT_TEXT,
      consent_at: new Date().toISOString(),
    });

    // Documents given here are remembered, so KYC at the hub never asks twice.
    await persistDocuments(supabaseAdmin, context.userId, {
      "dl-front": data.dlFrontPath,
      "dl-back": data.dlBackPath,
      selfie: data.selfiePath,
    });

    await track("eligibility_self_check", { result }, { customerId: context.userId });
    return { result };
  });

/** Most recent self-check, so the rider can see where they stand any time. */
export const getLatestEligibilityCheck = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("eligibility_checks")
      .select("id, result, created_at")
      .eq("customer_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data ?? null;
  });
