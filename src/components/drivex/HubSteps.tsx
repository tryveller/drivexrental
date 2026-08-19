/**
 * Steps a rider goes through at the hub: document verification, the pending
 * payment (with the helmet choice), and the rental agreement.
 *
 * These are shared by the rider's phone (/journey) and the hub kiosk (/kiosk)
 * so both screens run exactly the same rules and copy.
 */
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardCheck, Loader2, Wallet } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CaptureField } from "@/components/drivex/CaptureField";
import { ConsentRow } from "@/components/drivex/ConsentRow";
import { HelmetPicker } from "@/components/drivex/HelmetPicker";
import {
  acceptAgreement,
  getFinalPaymentBreakdown,
  getSavedDocuments,
  payFinalAmount,
  reuseSavedKyc,
  saveDocument,
  setExtraHelmet,
  submitHubKyc,
} from "@/lib/booking.functions";
import {
  OTHER_POSSIBLE_CHARGE_KEYS,
  type AddonRates,
  type HelmetMode,
  type PlanType,
  type RideDuration,
} from "@/lib/pricing";
import { rupees } from "@/lib/format";
import { useLanguage, type TKey } from "@/lib/i18n";

export function StepCard({
  icon,
  title,
  body,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  body: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">{title}</h2>
          <div className="mt-2">{body}</div>
          {action && <div className="mt-4">{action}</div>}
        </div>
      </div>
    </section>
  );
}

export function ActionButton<T>({
  label,
  run,
  onDone,
  variant,
  disabled,
  guard,
}: {
  label: string;
  run: () => Promise<T>;
  onDone: () => void | Promise<void>;
  variant?: "outline";
  disabled?: boolean;
  /** Return false to block the action (e.g. consent not ticked yet). */
  guard?: () => boolean;
}) {
  const { t } = useLanguage();
  const mutation = useMutation({
    mutationFn: run,
    onSuccess: async () => {
      await onDone();
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : t("genericError")),
  });

  return (
    <Button
      variant={variant}
      className="w-full sm:w-auto"
      onClick={() => {
        if (guard && !guard()) return;
        mutation.mutate();
      }}
      disabled={mutation.isPending || disabled}
    >
      {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {label}
    </Button>
  );
}

type KycDocStep = {
  slot: "dl-front" | "dl-back" | "address-proof" | "selfie" | "pan";
  labelKey: TKey;
  hintKey: TKey;
  facing?: "user" | "environment";
  optional?: boolean;
};

const KYC_DOC_STEPS: KycDocStep[] = [
  { slot: "dl-front", labelKey: "dlFrontLabel", hintKey: "dlFrontHint" },
  { slot: "dl-back", labelKey: "dlBackLabel", hintKey: "dlBackHint" },
  {
    slot: "address-proof",
    labelKey: "addressProofPhotoLabel",
    hintKey: "addressProofPhotoHint",
  },
  { slot: "selfie", labelKey: "selfieLabel", hintKey: "selfieHint", facing: "user" },
  { slot: "pan", labelKey: "panLabel", hintKey: "panHint", optional: true },
];

export function HubKycStep({
  bookingId,
  savedVerification,
  actionRequired,
  onDone,
}: {
  bookingId: string;
  savedVerification: boolean;
  actionRequired: string | null;
  onDone: () => void;
}) {
  const { t } = useLanguage();
  const saved = useQuery({ queryKey: ["saved-docs"], queryFn: () => getSavedDocuments() });
  const [docs, setDocs] = useState<Record<string, string | null>>({});
  const [index, setIndex] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [consent, setConsent] = useState(false);
  const [nudge, setNudge] = useState(false);

  function askForConsent() {
    setNudge(true);
    window.setTimeout(() => setNudge(false), 1000);
    toast.error(t("consentRequired"));
  }

  useEffect(() => {
    if (!saved.data || hydrated) return;
    setDocs({ ...saved.data });
    const firstMissing = KYC_DOC_STEPS.findIndex(
      (step) => !step.optional && !saved.data[step.slot],
    );
    setIndex(firstMissing === -1 ? KYC_DOC_STEPS.length - 1 : firstMissing);
    setHydrated(true);
  }, [saved.data, hydrated]);

  const remember = useMutation({
    mutationFn: (input: { docType: string; path: string }) => saveDocument({ data: input }),
  });

  const submit = useMutation({
    mutationFn: () =>
      submitHubKyc({
        data: {
          bookingId,
          consent,
          selfieCaptured: Boolean(docs["selfie"]),
          selfiePath: docs["selfie"] ?? null,
          dlFrontPath: docs["dl-front"] ?? null,
          dlBackPath: docs["dl-back"] ?? null,
          addressProofPath: docs["address-proof"] ?? null,
          panPath: docs["pan"] ?? null,
        },
      }),
    onSuccess: (data) => {
      if (data.status === "ACTION_REQUIRED") {
        toast.error(t("kycActionNeeded"));
      } else {
        toast.success(t("kycVerified"));
      }
      onDone();
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : t("kycSubmitFailed")),
  });

  const reuse = useMutation({
    mutationFn: () => reuseSavedKyc({ data: { bookingId } }),
    onSuccess: () => {
      toast.success(t("kycVerified"));
      onDone();
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : t("kycSubmitFailed")),
  });

  // A rider who is already verified never repeats the document wizard.
  if (savedVerification && !actionRequired) {
    return (
      <StepCard
        icon={<ClipboardCheck className="h-5 w-5 text-primary" />}
        title={t("kycReuseTitle")}
        body={<p className="text-sm text-muted-foreground">{t("kycReuseBody")}</p>}
        action={
          <Button className="w-full" onClick={() => reuse.mutate()} disabled={reuse.isPending}>
            {reuse.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("kycReuseAction")}
          </Button>
        }
      />
    );
  }

  if (saved.isLoading && !hydrated) {
    return (
      <StepCard
        icon={<ClipboardCheck className="h-5 w-5 text-primary" />}
        title={t("kycTitle")}
        body={<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      />
    );
  }

  const step = KYC_DOC_STEPS[index] ?? KYC_DOC_STEPS[0]!;
  const total = KYC_DOC_STEPS.length;
  const value = docs[step.slot] ?? null;
  const isLast = index === total - 1;
  const requiredDone = KYC_DOC_STEPS.every(
    (item) => item.optional || Boolean(docs[item.slot]),
  );
  const wasSavedEarlier = Boolean(saved.data?.[step.slot]) && docs[step.slot] === saved.data?.[step.slot];

  function setPath(path: string | null) {
    setDocs((old) => ({ ...old, [step.slot]: path }));
    if (path) remember.mutate({ docType: step.slot, path });
  }

  return (
    <StepCard
      icon={<ClipboardCheck className="h-5 w-5 text-primary" />}
      title={t("kycTitle")}
      body={
        <div className="space-y-3">
          {actionRequired && (
            <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {actionRequired}
            </p>
          )}
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {t("docStepProgress", { step: index + 1, total })}
            </Badge>
            <span className="text-xs text-muted-foreground">{t("docStepOneAtATime")}</span>
          </div>
          <div className="flex gap-1.5">
            {KYC_DOC_STEPS.map((item, position) => (
              <span
                key={item.slot}
                className={
                  "h-1.5 flex-1 rounded-full " +
                  (docs[item.slot]
                    ? "bg-primary"
                    : position === index
                      ? "bg-primary/40"
                      : "bg-border")
                }
              />
            ))}
          </div>
          {wasSavedEarlier && (
            <p className="text-xs font-medium text-primary">{t("savedEarlier")}</p>
          )}
          {isLast && (
            <ConsentRow
              checked={consent}
              onChange={setConsent}
              highlight={nudge}
            >
              {t("documentConsent")}
            </ConsentRow>
          )}
          <CaptureField
            key={step.slot}
            bookingId={bookingId}
            slot={step.slot}
            label={t(step.labelKey)}
            hint={t(step.hintKey)}
            facing={step.facing ?? "environment"}
            value={value}
            onChange={setPath}
          />
        </div>
      }
      action={
        <div className="flex w-full flex-col gap-2 sm:flex-row">
          {index > 0 && (
            <Button
              variant="ghost"
              className="w-full sm:w-auto"
              onClick={() => setIndex((old) => Math.max(0, old - 1))}
            >
              ←
            </Button>
          )}
          {!isLast ? (
            <Button
              className="w-full sm:flex-1"
              onClick={() => setIndex((old) => Math.min(total - 1, old + 1))}
              disabled={!value && !step.optional}
            >
              {t("continueLabel")}
            </Button>
          ) : (
            <Button
              className="w-full sm:flex-1"
              onClick={() => {
                if (!consent) {
                  askForConsent();
                  return;
                }
                submit.mutate();
              }}
              disabled={submit.isPending || !requiredDone}
            >
              {submit.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("submitDocuments")}
            </Button>
          )}
          {step.optional && !isLast && (
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setIndex((old) => Math.min(total - 1, old + 1))}
            >
              {t("skipForNow")}
            </Button>
          )}
        </div>
      }
    />
  );
}

export function PaymentStep({
  bookingId,
  plan,
  duration,
  rates,
  onDone,
}: {
  bookingId: string;
  plan: { plan_type: PlanType } | null;
  duration: RideDuration | null;
  rates: AddonRates;
  onDone: () => void;
}) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const breakdown = useQuery({
    queryKey: ["final-breakdown", bookingId],
    queryFn: () => getFinalPaymentBreakdown({ data: { bookingId } }),
  });

  const helmet = useMutation({
    mutationFn: (mode: HelmetMode) => setExtraHelmet({ data: { bookingId, mode } }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["final-breakdown", bookingId] }),
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : t("paymentError")),
  });

  const pay = useMutation({
    mutationFn: (simulateFailure: boolean) =>
      payFinalAmount({ data: { bookingId, simulateFailure } }),
    onSuccess: (data) => {
      if (data.status === "FAILED") {
        toast.error(t("paymentFailed"));
      } else {
        toast.success(t("paymentReceived"));
        onDone();
      }
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : t("paymentError")),
  });

  return (
    <StepCard
      icon={<Wallet className="h-5 w-5 text-primary" />}
      title={t("payRemainingTitle")}
      body={
        breakdown.isLoading || !breakdown.data ? (
          <p className="text-sm text-muted-foreground">{t("preparingSummary")}</p>
        ) : (
          <div className="space-y-3">
            {plan && (
              <HelmetPicker
                plan={plan}
                duration={duration}
                rates={rates}
                value={breakdown.data.helmetMode}
                onChange={(mode) => helmet.mutate(mode)}
                disabled={helmet.isPending}
              />
            )}
            <dl className="space-y-1.5 text-sm">
              {breakdown.data.lines.map((line) => (
                <div key={line.labelKey} className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">
                    {t(line.labelKey as TKey, line.labelVars)}
                  </dt>
                  <dd className="font-medium">{rupees(line.amount)}</dd>
                </div>
              ))}
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">{t("reservationAlreadyPaid")}</dt>
                <dd className="font-medium text-primary">
                  −{rupees(breakdown.data.reservationCredit)}
                </dd>
              </div>
              {breakdown.data.walletCredit > 0 && (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">{t("walletApplied")}</dt>
                  <dd className="font-medium text-primary">
                    −{rupees(breakdown.data.walletCredit)}
                  </dd>
                </div>
              )}
              <div className="flex justify-between gap-4 border-t border-border pt-2 text-base">
                <dt className="font-semibold">{t("amountDueNow")}</dt>
                <dd className="font-semibold">{rupees(breakdown.data.amountDue)}</dd>
              </div>
            </dl>
            <details className="rounded-xl bg-secondary px-3 py-2 text-xs text-secondary-foreground">
              <summary className="cursor-pointer font-medium">{t("otherCharges")}</summary>
              <ul className="mt-2 list-disc space-y-1 pl-4">
                {OTHER_POSSIBLE_CHARGE_KEYS.map((key) => (
                  <li key={key}>{t(key)}</li>
                ))}
              </ul>
            </details>
          </div>
        )
      }
      action={
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            className="w-full sm:w-auto"
            onClick={() => pay.mutate(false)}
            disabled={pay.isPending}
          >
            {pay.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("payNowLabel")}
          </Button>
          <Button
            variant="ghost"
            className="w-full sm:w-auto"
            onClick={() => pay.mutate(true)}
            disabled={pay.isPending}
          >
            {t("simulateFailure")}
          </Button>
        </div>
      }
    />
  );
}

export function AgreementStep({ bookingId, onDone }: { bookingId: string; onDone: () => void }) {
  const { t } = useLanguage();
  const [read, setRead] = useState(false);

  return (
    <StepCard
      icon={<ClipboardCheck className="h-5 w-5 text-primary" />}
      title={t("agreementTitle")}
      body={
        <div className="space-y-3">
          <div className="max-h-52 overflow-y-auto rounded-xl border border-border bg-background p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">{t("agreementHeading")}</p>
            <p className="mt-2">{t("agreementP1")}</p>
            <p className="mt-2">{t("agreementP2")}</p>
            <p className="mt-2">{t("agreementP3")}</p>
            <p className="mt-2">{t("agreementP4")}</p>
          </div>
          <label className="flex items-start gap-2 text-xs text-muted-foreground">
            <Checkbox
              checked={read}
              onCheckedChange={(value) => setRead(value === true)}
              className="mt-0.5"
            />
            <span>{t("agreementAcceptCheck")}</span>
          </label>
        </div>
      }
      action={
        read ? (
          <ActionButton
            label={t("acceptContinue")}
            run={() => acceptAgreement({ data: { bookingId } })}
            onDone={onDone}
          />
        ) : (
          <Button disabled className="w-full sm:w-auto">
            {t("acceptContinue")}
          </Button>
        )
      }
    />
  );
}
