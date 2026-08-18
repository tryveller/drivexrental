/**
 * Single source of truth for how a rider's self-check is scored.
 *
 * Riders only upload documents — nothing about the licence is typed in — so the
 * indicative result depends on which captures are present. The binding decision
 * is always made by the hub team during KYC.
 */
export type EligibilityResult = "LIKELY_ELIGIBLE" | "ADDITIONAL_VERIFICATION";

export function evaluateEligibility(docs: {
  dlFrontPath?: string | null;
  selfiePath?: string | null;
}): EligibilityResult {
  return docs.dlFrontPath && docs.selfiePath ? "LIKELY_ELIGIBLE" : "ADDITIONAL_VERIFICATION";
}
