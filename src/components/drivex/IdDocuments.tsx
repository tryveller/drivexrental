import { useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Fingerprint,
  IdCard,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { CaptureField } from "@/components/drivex/CaptureField";
import { CallDriveXButton, TrustPanel } from "@/components/drivex/Blocks";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { EligibilityMethod } from "@/lib/eligibility";
import type { KycSlot } from "@/lib/kyc-upload";

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

/**
 * Aadhaar, Driving Licence and PAN — one document per screen, so the rider
 * only ever sees a single thing to do before tapping Next.
 */
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
  const [step, setStep] = useState(0);

  const steps: {
    slot: KycSlot;
    icon: typeof IdCard;
    label: string;
    hint: string;
    value: string | null;
    optional?: boolean;
    set: (path: string | null) => void;
  }[] = [
    {
      slot: "aadhaar-front",
      icon: IdCard,
      label: t("aadhaarFrontLabel"),
      hint: t("aadhaarFrontHint"),
      value: docs.aadhaarFrontPath,
      set: (path) => onChange({ aadhaarFrontPath: path }),
    },
    {
      slot: "aadhaar-back",
      icon: IdCard,
      label: t("aadhaarBackLabel"),
      hint: t("aadhaarBackHint"),
      value: docs.aadhaarBackPath,
      set: (path) => onChange({ aadhaarBackPath: path }),
    },
    {
      slot: "dl-front",
      icon: CreditCard,
      label: t("dlFrontLabel"),
      hint: t("dlFrontHint"),
      value: docs.dlFrontPath,
      set: (path) => onChange({ dlFrontPath: path }),
    },
    {
      slot: "dl-back",
      icon: CreditCard,
      label: t("dlBackLabel"),
      hint: t("dlBackHint"),
      value: docs.dlBackPath,
      set: (path) => onChange({ dlBackPath: path }),
    },
    {
      slot: "pan",
      icon: Fingerprint,
      label: t("panLabel"),
      hint: t("panHint"),
      value: docs.panPath,
      optional: true,
      set: (path) => onChange({ panPath: path }),
    },
  ];

  const total = steps.length;
  const current = steps[Math.min(step, total - 1)]!;
  const last = step >= total - 1;
  const canGoOn = Boolean(current.value) || Boolean(current.optional);

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

      {/* Progress as icons: done, current, still to come. */}
      <div className="flex items-center justify-center gap-2">
        {steps.map((item, position) => {
          const done = Boolean(item.value);
          return (
            <button
              key={item.slot}
              type="button"
              aria-label={item.label}
              onClick={() => setStep(position)}
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-xl border transition",
                position === step
                  ? "border-primary bg-primary/15 text-primary"
                  : done
                    ? "border-success/50 bg-success/10 text-success"
                    : "border-border bg-card/60 text-muted-foreground",
              )}
            >
              {done ? <Check className="h-5 w-5" /> : <item.icon className="h-5 w-5" />}
            </button>
          );
        })}
      </div>

      <p className="text-center text-[11px] text-muted-foreground">
        {t("stepXofY", { index: step + 1, total })}
        {current.optional ? ` · ${t("optionalTag")}` : ""}
      </p>

      {/* Exactly one document on screen at a time. */}
      <CaptureField
        key={current.slot}
        {...(bookingId ? { bookingId } : {})}
        slot={current.slot}
        label={current.label}
        hint={current.hint}
        value={current.value}
        onChange={current.set}
      />

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="lg"
          disabled={step === 0}
          onClick={() => setStep((value) => Math.max(0, value - 1))}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          {t("backLabel")}
        </Button>
        {!last ? (
          <Button
            type="button"
            size="lg"
            className="ml-auto"
            disabled={!canGoOn}
            onClick={() => setStep((value) => Math.min(total - 1, value + 1))}
          >
            {t("nextLabel")}
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        ) : (
          <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-semibold text-success">
            <Check className="h-4 w-4" />
            {t("allDocsDone")}
          </span>
        )}
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
