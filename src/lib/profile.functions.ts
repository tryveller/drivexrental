import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Wallet, saved verification, linked numbers and history for one rider. */
export const getRiderProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { kycReusable } = await import("./profile.server");

    const { data: me } = await supabase
      .from("customers")
      .select("profile_id, phone")
      .eq("id", userId)
      .maybeSingle();
    const profileId = me?.profile_id ?? null;
    if (!profileId) {
      return {
        profile: null,
        phones: [],
        invites: [],
        wallet: [],
        kycReusable: false,
        rides: 0,
        paidTotal: 0,
      };
    }

    const [profileRes, phonesRes, invitesRes, walletRes, ridesRes, paymentsRes] = await Promise.all([
      supabase.from("rider_profiles").select("*").eq("id", profileId).maybeSingle(),
      supabase
        .from("customers")
        .select("id, phone, full_name, created_at")
        .eq("profile_id", profileId)
        .order("created_at", { ascending: true }),
      supabase
        .from("rider_phone_invites")
        .select("id, phone, label, consumed_at, created_at")
        .eq("profile_id", profileId)
        .is("consumed_at", null),
      supabase
        .from("wallet_ledger")
        .select("id, entry_type, direction, amount, note, created_at")
        .eq("profile_id", profileId)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase.from("bookings").select("id, status").eq("customer_id", userId),
      supabase
        .from("payments")
        .select("amount, status")
        .eq("customer_id", userId)
        .eq("status", "SUCCESS"),
    ]);

    return {
      profile: profileRes.data ?? null,
      phones: (phonesRes.data ?? []).map((row) => ({
        ...row,
        isCurrent: row.id === userId,
      })),
      invites: invitesRes.data ?? [],
      wallet: walletRes.data ?? [],
      kycReusable: kycReusable(profileRes.data),
      rides: (ridesRes.data ?? []).filter((row) => row.status === "CLOSED").length,
      paidTotal: (paymentsRes.data ?? []).reduce((sum, row) => sum + (row.amount ?? 0), 0),
    };
  });

/**
 * Invites another driver's number onto the same rider profile. That number
 * still logs in with its own OTP — it simply joins this profile, so the saved
 * documents, wallet and history are shared instead of duplicated.
 */
export const inviteRiderPhone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { phone: string; label?: string }) => input)
  .handler(async ({ data, context }) => {
    const phone = data.phone.replace(/\D/g, "").slice(-10);
    if (phone.length !== 10) throw new Error("Enter a valid 10-digit mobile number");
    const label = (data.label ?? "").trim().slice(0, 60) || null;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { ensureProfileForCustomer, profileIdFor } = await import("./profile.server");

    const { data: me } = await supabaseAdmin
      .from("customers")
      .select("id, phone, profile_id")
      .eq("id", context.userId)
      .maybeSingle();
    if (!me) throw new Error("Please verify your mobile number again.");
    if (me.phone === phone) throw new Error("This number is already on your profile.");

    const profileId =
      me.profile_id ?? (await ensureProfileForCustomer(supabaseAdmin, context.userId, me.phone));

    const { data: existing } = await supabaseAdmin
      .from("customers")
      .select("id, profile_id")
      .eq("phone", phone)
      .maybeSingle();

    if (existing) {
      const otherProfile = await profileIdFor(supabaseAdmin, existing.id);
      if (otherProfile === profileId) return { ok: true, linked: true as const };
      if (otherProfile) {
        throw new Error(
          "That number already has its own DriveX profile. Ask them to sign in and we'll keep the profiles separate.",
        );
      }
      await supabaseAdmin
        .from("customers")
        .update({ profile_id: profileId })
        .eq("id", existing.id);
      await supabaseAdmin
        .from("customer_documents")
        .update({ profile_id: profileId })
        .eq("customer_id", existing.id);
      return { ok: true, linked: true as const };
    }

    const { error } = await supabaseAdmin.from("rider_phone_invites").upsert(
      {
        profile_id: profileId,
        phone,
        label,
        invited_by: context.userId,
        consumed_at: null,
      },
      { onConflict: "profile_id,phone" },
    );
    if (error) throw new Error(error.message);
    return { ok: true, linked: false as const };
  });

export const revokeRiderPhoneInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { inviteId: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { profileIdFor } = await import("./profile.server");
    const profileId = await profileIdFor(supabaseAdmin, context.userId);
    if (!profileId) throw new Error("No rider profile found");
    await supabaseAdmin
      .from("rider_phone_invites")
      .delete()
      .eq("id", data.inviteId)
      .eq("profile_id", profileId);
    return { ok: true };
  });
