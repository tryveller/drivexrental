import type { SupabaseClient } from "@supabase/supabase-js";

type Admin = SupabaseClient<any, any, any>;

/** A verified rider profile stays valid for a year before we re-check documents. */
export const KYC_VALID_DAYS = 365;

export type WalletEntry = {
  profileId: string;
  customerId?: string | null;
  bookingId?: string | null;
  entryType:
    | "DEPOSIT_HELD"
    | "DEPOSIT_RELEASED"
    | "TOPUP"
    | "CHECKOUT_APPLIED"
    | "REFUND_PAYOUT"
    | "ADJUSTMENT";
  amount: number;
  note?: string;
  /** Deposit money is tracked separately so we can show what is refundable. */
  deposit?: boolean;
};

/**
 * One rider, one profile — even when they log in from a different number.
 * A number invited onto an existing profile joins it on first login, which is
 * how a second driver in the same household is handled.
 */
export async function ensureProfileForCustomer(
  admin: Admin,
  customerId: string,
  phone: string,
): Promise<string> {
  const { data: customer } = await admin
    .from("customers")
    .select("profile_id, full_name")
    .eq("id", customerId)
    .maybeSingle();
  if (customer?.profile_id) return customer.profile_id as string;

  const { data: invite } = await admin
    .from("rider_phone_invites")
    .select("id, profile_id")
    .eq("phone", phone)
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let profileId = invite?.profile_id as string | undefined;

  if (invite) {
    await admin
      .from("rider_phone_invites")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", invite.id);
  }

  if (!profileId) {
    const { data: created, error } = await admin
      .from("rider_profiles")
      .insert({ display_name: customer?.full_name ?? null })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    profileId = created.id as string;
  }

  await admin.from("customers").update({ profile_id: profileId }).eq("id", customerId);
  await admin
    .from("customer_documents")
    .update({ profile_id: profileId })
    .eq("customer_id", customerId);
  return profileId;
}

export async function profileIdFor(client: Admin, customerId: string): Promise<string | null> {
  const { data } = await client
    .from("customers")
    .select("profile_id")
    .eq("id", customerId)
    .maybeSingle();
  return (data?.profile_id as string | null) ?? null;
}

/** Reads the saved profile, so a returning rider never repeats verification. */
export async function readProfile(client: Admin, customerId: string) {
  const profileId = await profileIdFor(client, customerId);
  if (!profileId) return null;
  const { data } = await client
    .from("rider_profiles")
    .select("*")
    .eq("id", profileId)
    .maybeSingle();
  return data ?? null;
}

/** True when a saved verification can be reused for a new booking. */
export function kycReusable(profile: { kyc_status?: string; kyc_expires_on?: string | null } | null) {
  if (!profile || profile.kyc_status !== "APPROVED") return false;
  if (!profile.kyc_expires_on) return true;
  return new Date(`${profile.kyc_expires_on}T23:59:59`).getTime() > Date.now();
}

/** Copies an approved hub KYC onto the rider profile so it is reused later. */
export async function promoteKycToProfile(
  admin: Admin,
  customerId: string,
  kyc: {
    dl_number?: string | null;
    dl_name?: string | null;
    dl_dob?: string | null;
    dl_valid_until?: string | null;
  } = {},
) {
  const profileId = await profileIdFor(admin, customerId);
  if (!profileId) return null;
  const expires = new Date(Date.now() + KYC_VALID_DAYS * 86400000)
    .toISOString()
    .slice(0, 10);
  await admin
    .from("rider_profiles")
    .update({
      kyc_status: "APPROVED",
      kyc_approved_at: new Date().toISOString(),
      kyc_expires_on: expires,
      dl_number: kyc.dl_number ?? null,
      dl_name: kyc.dl_name ?? null,
      dl_dob: kyc.dl_dob ?? null,
      dl_valid_until: kyc.dl_valid_until ?? null,
    })
    .eq("id", profileId);
  return profileId;
}

/** Every wallet movement is written to the ledger and mirrored on the profile. */
export async function moveWallet(admin: Admin, entry: WalletEntry) {
  if (entry.amount <= 0) return null;
  const direction =
    entry.entryType === "DEPOSIT_HELD" ||
    entry.entryType === "TOPUP" ||
    entry.entryType === "DEPOSIT_RELEASED"
      ? "CREDIT"
      : "DEBIT";

  const { data: profile } = await admin
    .from("rider_profiles")
    .select("wallet_balance, deposit_in_wallet")
    .eq("id", entry.profileId)
    .maybeSingle();
  if (!profile) return null;

  const sign = direction === "CREDIT" ? 1 : -1;
  const balance = Math.max(0, (profile.wallet_balance ?? 0) + sign * entry.amount);
  const depositHeld = entry.deposit
    ? Math.max(0, (profile.deposit_in_wallet ?? 0) + sign * entry.amount)
    : Math.min(profile.deposit_in_wallet ?? 0, balance);

  await admin
    .from("wallet_ledger")
    .insert({
      profile_id: entry.profileId,
      customer_id: entry.customerId ?? null,
      booking_id: entry.bookingId ?? null,
      entry_type: entry.entryType,
      direction,
      amount: entry.amount,
      note: entry.note ?? null,
    });

  await admin
    .from("rider_profiles")
    .update({ wallet_balance: balance, deposit_in_wallet: depositHeld })
    .eq("id", entry.profileId);

  return { balance, depositHeld };
}
