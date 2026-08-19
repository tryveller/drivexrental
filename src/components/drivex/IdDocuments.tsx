import { Fingerprint, ShieldCheck, Sparkles } from "lucide-react";

import { CaptureField } from "@/components/drivex/CaptureField";
import { CallDriveXButton, TrustPanel } from "@/components/drivex/Blocks";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { EligibilityMethod } from "@/lib/eligibility";

export type IdDocState = {
  aadhaarFrontPath: string | null;
  aadhaarBackPath: string | null;
  dlFrontPath: string | null;
  dlBackPath: string | null;
  panPath: string | null;
};

export const EMPTY_ID_DOCS: IdDocState = {
  aadhaarFrontPath: null,
  aadhaarBackPath: null,
  dlFrontPath: null,
  dlBackPath: null,
  panPath: null,
};

/** Aadhaar, Driving Licence and PAN — the ID set an eligibility check needs. */
export function IdDocumentFields({
  bookingId,
  docs,
  onChange,
}: {
  bookingId?: string;
  docs: IdDocState;
  onChange: (next: Partial<IdDocState>) => void;
}) {
  const { t } = useLanguage();
  return (
    <div className="space-y-3">
      {/* Trust first: what, why, what next — three short lines before any ask. */}
      <TrustPanel
        items={[
          { title: t("idTrustWhatTitle"), body: t("idTrustWhatBody") },
          { title: t("idTrustWhyTitle"), body: t("idTrustWhyBody") },
          { title: t("idTrustNextTitle"), body: t("idTrustNextBody") },
        ]}
      />
      <div className="grid gap-3 sm:grid-cols-2">
      <CaptureField
        {...(bookingId ? { bookingId } : {})}
        slot="aadhaar-front"
        label={t("aadhaarFrontLabel")}
        hint={t("aadhaarFrontHint")}
        value={docs.aadhaarFrontPath}
        onChange={(path) => onChange({ aadhaarFrontPath: path })}
      />
      <CaptureField
        {...(bookingId ? { bookingId } : {})}
        slot="aadhaar-back"
        label={t("aadhaarBackLabel")}
        hint={t("aadhaarBackHint")}
        value={docs.aadhaarBackPath}
        onChange={(path) => onChange({ aadhaarBackPath: path })}
      />
      <CaptureField
        {...(bookingId ? { bookingId } : {})}
        slot="dl-front"
        label={t("dlFrontLabel")}
        hint={t("dlFrontHint")}
        value={docs.dlFrontPath}
        onChange={(path) => onChange({ dlFrontPath: path })}
      />
      <CaptureField
        {...(bookingId ? { bookingId } : {})}
        slot="dl-back"
        label={t("dlBackLabel")}
        hint={t("dlBackHint")}
        value={docs.dlBackPath}
        onChange={(path) => onChange({ dlBackPath: path })}
      />
      <CaptureField
        {...(bookingId ? { bookingId } : {})}
        slot="pan"
        label={t("panLabel")}
        hint={t("panHint")}
        value={docs.panPath}
        onChange={(path) => onChange({ panPath: path })}
      />
      </div>
      <div className="flex items-center gap-3">
        <p className="text-[11px] text-muted-foreground">{t("callHelpNote")}</p>
        <CallDriveXButton className="ml-auto shrink-0" />
      </div>
    </div>
  );
}

/**
 * Two ways to hand over IDs. DigiLocker is not live yet — it stays visibly
 * marked so nobody waits for a verification that cannot arrive.
 */
export function IdMethodPicker({
  method,
  onMethod,
  digilockerReady = false,
}: {
  method: EligibilityMethod;
  onMethod: (next: EligibilityMethod) => void;
  digilockerReady?: boolean;
}) {
  const { t } = useLanguage();
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {/* Clicking a picture is the familiar option, so it comes first. */}
      <button
        type="button"
        onClick={() => onMethod("UPLOAD")}
        className={cn(
          "rounded-2xl border p-4 text-left transition",
          method === "UPLOAD" ? "border-primary bg-primary/10" : "border-border bg-card/60",
        )}
      >
        <span className="flex items-center gap-2 text-sm font-medium">
          <Fingerprint className="h-4 w-4 text-primary" />
          {t("uploadIdsTitle")}
        </span>
        <span className="mt-1 block text-xs text-muted-foreground">{t("uploadIdsHint")}</span>
      </button>

      <button
        type="button"
        disabled={!digilockerReady}
        onClick={() => onMethod("DIGILOCKER")}
        className={cn(
          "rounded-2xl border p-4 text-left transition",
          method === "DIGILOCKER" && digilockerReady
            ? "border-primary bg-primary/10"
            : "border-border bg-card/60",
          !digilockerReady && "opacity-60",
        )}
      >
        <span className="flex items-center gap-2 text-sm font-medium">
          <ShieldCheck className="h-4 w-4 text-primary" />
          {t("digilockerTitle")}
          {!digilockerReady && (
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] uppercase tracking-wide text-secondary-foreground">
              {t("digilockerSoon")}
            </span>
          )}
        </span>
        <span className="mt-1 block text-xs text-muted-foreground">{t("digilockerHint")}</span>
      </button>
    </div>
  );
}

/** Documents are in, the answer is not — shown instead of a stale result. */
export function PendingConfirmation() {
  const { t } = useLanguage();
  return (
    <div className="rounded-2xl border border-primary/40 bg-primary/5 p-4">
      <span className="flex items-center gap-2 text-sm font-medium">
        <Sparkles className="h-4 w-4 text-primary" />
        {t("eligibilityPendingTitle")}
      </span>
      <p className="mt-1 text-xs text-muted-foreground">{t("eligibilityPendingBody")}</p>
      <CallDriveXButton className="mt-3" />
    </div>
  );
}
