import type { SupabaseClient } from "@supabase/supabase-js";

export const DOC_TYPES = [
  "dl-front",
  "dl-back",
  "aadhaar-front",
  "aadhaar-back",
  "address-proof",
  "selfie",
  "pan",
] as const;
export type DocType = (typeof DOC_TYPES)[number];

/** Remembers each document a rider has already given, so we never ask twice. */
export async function persistDocuments(
  admin: SupabaseClient<any, any, any>,
  customerId: string,
  entries: Partial<Record<DocType, string | null | undefined>>,
) {
  const rows = DOC_TYPES.flatMap((docType) => {
    const path = entries[docType];
    return path ? [{ customer_id: customerId, doc_type: docType, path }] : [];
  });
  if (rows.length === 0) return;
  await admin.from("customer_documents").upsert(rows, { onConflict: "customer_id,doc_type" });
}

export async function readDocuments(
  client: SupabaseClient<any, any, any>,
  customerId: string,
): Promise<Record<string, string>> {
  const { data } = await client
    .from("customer_documents")
    .select("doc_type, path")
    .eq("customer_id", customerId);
  const map: Record<string, string> = {};
  for (const row of data ?? []) map[row.doc_type as string] = row.path as string;
  return map;
}
