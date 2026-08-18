/**
 * Single source of truth for how a rider's self-check is scored.
 *
 * Riders only give documents — Aadhaar, Driving Licence and (optionally) PAN,
 * either pulled from DigiLocker or clicked/uploaded as pictures. Nothing about
 * the licence is typed in, so the indicative result depends on which IDs are
 * present. The binding decision is always made by the hub team during KYC.
 */
export type EligibilityResult = "LIKELY_ELIGIBLE" | "ADDITIONAL_VERIFICATION";

/** How the rider gave their IDs. */
export type EligibilityMethod = "DIGILOCKER" | "UPLOAD";

export type EligibilityDocs = {
  dlFrontPath?: string | null;
  dlBackPath?: string | null;
  aadhaarFrontPath?: string | null;
  aadhaarBackPath?: string | null;
  panPath?: string | null;
};

/** The two IDs we cannot score without. PAN stays optional. */
export function eligibilityDocsComplete(docs: EligibilityDocs): boolean {
  return Boolean(docs.dlFrontPath && docs.aadhaarFrontPath);
}

export function evaluateEligibility(docs: EligibilityDocs): EligibilityResult {
  return eligibilityDocsComplete(docs) ? "LIKELY_ELIGIBLE" : "ADDITIONAL_VERIFICATION";
}
