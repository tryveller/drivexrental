import { supabase } from "@/integrations/supabase/client";

export const KYC_BUCKET = "kyc-docs";

export type KycSlot = "selfie" | "dl-front" | "dl-back" | "address-proof" | "pan";

/** Uploads a captured photo (or picked file) to the rider's private KYC folder. */
export async function uploadKycFile(
  /** Booking id, or "self-check" for documents given outside a booking. */
  scope: string,
  slot: KycSlot,
  file: Blob,
  fileName?: string,
): Promise<string> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) throw new Error("Please verify your mobile number again.");

  const ext =
    (fileName?.includes(".") ? fileName.split(".").pop() : undefined) ??
    (file.type === "application/pdf" ? "pdf" : (file.type.split("/")[1] || "jpg"));
  const path = `${userId}/${scope}/${slot}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from(KYC_BUCKET).upload(path, file, {
    contentType: file.type || "image/jpeg",
    upsert: true,
  });
  if (error) throw new Error(error.message);
  return path;
}

export async function kycFileUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from(KYC_BUCKET).createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}
