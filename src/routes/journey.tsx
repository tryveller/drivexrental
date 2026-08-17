import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  BadgeCheck,
  Bike,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  MapPin,
  ShieldAlert,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/drivex/AppShell";
import { CaptureField } from "@/components/drivex/CaptureField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useRiderSession } from "@/hooks/useRiderSession";
import { getCatalog } from "@/lib/catalog.functions";
import {
  acceptAgreement,
  changePickupDate,
  checkInAtHub,
  confirmHandover,
  createBooking,
  getFinalPaymentBreakdown,
  getJourney,
  payFinalAmount,
  payReservation,
  setTravelMode,
  skipEligibility,
  submitEligibility,
  submitHubKyc,
} from "@/lib/booking.functions";
import {
  MAX_PICKUP_SHIFT_DAYS,
  OTHER_POSSIBLE_CHARGE_KEYS,
  buildQuote,
  computeDuration,
  slotLabelKey,
} from "@/lib/pricing";
import { longDate, modelTitle, rupees } from "@/lib/format";
import { useLanguage, type TKey } from "@/lib/i18n";

export const Route = createFileRoute("/journey")({
  head: () => ({
    meta: [
      { title: "Your DriveX booking" },
      {
        name: "description",
        content:
          "Track your DriveX reservation: eligibility, hub verification, payment, agreement and vehicle handover.",
      },
      { property: "og:title", content: "Your DriveX booking" },
      {
        property: "og:description",
        content: "Track your reservation from ₹199 hold through to riding away from the hub.",
      },
    ],
  }),
  component: JourneyPage,
});

type Step =
  | "PLAN"
  | "ELIGIBILITY"
  | "RESERVE"
  | "TRAVEL"
  | "AT_HUB"
  | "KYC"
  | "PAYMENT"
  | "AGREEMENT"
  | "HANDOVER"
  | "DONE";

function stepFor(status: string | undefined): Step {
  switch (status) {
    case undefined:
    case "DISCOVERY":
    case "BIKE_SELECTED":
      return "PLAN";
    case "OTP_VERIFIED":
      return "ELIGIBILITY";
    case "ELIGIBILITY_COMPLETED":
    case "ELIGIBILITY_SKIPPED":
    case "PAYMENT_PENDING":
      return "RESERVE";
    case "RESERVED":
      return "TRAVEL";
    case "TRAVEL_TO_HUB":
    case "AT_HUB":
      return "AT_HUB";
    case "KYC_IN_PROGRESS":
      return "KYC";
    case "FINAL_PAYMENT_PENDING":
      return "PAYMENT";
    case "PAID":
      return "AGREEMENT";
    case "HANDOVER_PENDING":
    case "AGREEMENT_ACCEPTED":
    case "VEHICLE_ASSIGNED":
      return "HANDOVER";
    default:
      return "DONE";
  }
}

function JourneyPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const session = useRiderSession();
  const queryClient = useQueryClient();
  const [bootstrapped, setBootstrapped] = useState(false);
  // A selection carried through sign-in becomes a booking on this screen, so we
  // must not flash the "no booking" empty state while that call is in flight.
  const [creating, setCreating] = useState(
    () => typeof window !== "undefined" && Boolean(sessionStorage.getItem("drivex.selection")),
  );

  const journey = useQuery({
    queryKey: ["journey"],
    queryFn: () => getJourney(),
    enabled: Boolean(session.userId),
  });
  const catalog = useQuery({ queryKey: ["catalog"], queryFn: () => getCatalog() });

  useEffect(() => {
    if (!session.loading && !session.userId) navigate({ to: "/auth" });
  }, [session, navigate]);

  // Carry the selection made before sign-in into a booking exactly once.
  useEffect(() => {
    if (bootstrapped || !session.userId || !journey.data) return;
    const raw = sessionStorage.getItem("drivex.selection");
    setBootstrapped(true);
    if (!raw) {
      setCreating(false);
      return;
    }
    const selection = JSON.parse(raw) as {
      modelId: string;
      hubId: string;
      planId: string;
      pickupOn?: string;
      pickupSlot?: string;
      dropoffOn?: string;
      dropoffSlot?: string;
    };
    sessionStorage.removeItem("drivex.selection");
    setCreating(true);
    createBooking({ data: selection })
      .then(() => queryClient.invalidateQueries({ queryKey: ["journey"] }))
      .catch((error: unknown) =>
        toast.error(error instanceof Error ? error.message : t("couldNotStartBooking")),
      )
      .finally(() => setCreating(false));
  }, [bootstrapped, session.userId, journey.data, queryClient, t]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["journey"] });

  if (session.loading || journey.isLoading || catalog.isLoading || creating) {
    return (
      <AppShell subtitle={t("subtitleBooking")}>
        <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
          {creating ? t("preparingBooking") : t("loadingBooking")}
        </div>
      </AppShell>
    );
  }

  const booking = journey.data?.booking ?? null;
  const kyc = journey.data?.kyc ?? null;
  const step = stepFor(booking?.status);
  const plan = catalog.data?.plans.find((row) => row.id === booking?.plan_id) ?? null;
  const model = catalog.data?.models.find((row) => row.id === booking?.model_id) ?? null;
  const hub = catalog.data?.hubs.find((row) => row.id === booking?.hub_id) ?? null;

  if (!booking || !plan || !model || !hub) {
    return (
      <AppShell subtitle={t("subtitleBooking")}>
        <EmptyState onBrowse={() => navigate({ to: "/" })} />
      </AppShell>
    );
  }

  if (booking.status === "ACTIVE" || booking.status === "RETURN_REQUESTED") {
    return (
      <AppShell subtitle={t("subtitleBooking")}>
        <div className="rounded-2xl border border-border bg-card p-5 text-center">
          <CheckCircle2 className="mx-auto h-8 w-8 text-primary" />
          <h1 className="mt-3 text-xl font-semibold">{t("bikeWithYou")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("bikeWithYouBody")}</p>
          <Button className="mt-4" onClick={() => navigate({ to: "/my-bike" })}>
            {t("openMyBike")}
          </Button>
        </div>
      </AppShell>
    );
  }

  const duration = computeDuration(
    booking.pickup_on,
    booking.pickup_slot,
    booking.dropoff_on,
    booking.dropoff_slot,
  );
  const quote = buildQuote(plan, duration);

  return (
    <AppShell subtitle={t("subtitleBooking")}>
      <header className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">
              {t("bookingLabel", { code: booking.booking_code })}
            </p>
            <h1 className="mt-1 text-lg font-semibold">
              {modelTitle(model.brand, model.name)}
            </h1>
            <p className="text-sm text-muted-foreground">
              {hub.name} ·{" "}
              {plan.plan_type === "RTO"
                ? t("planRto")
                : `${rupees(plan.rental_amount)} / ${plan.billing_period}`}
            </p>
          </div>
          <Badge variant="secondary">{booking.status.replaceAll("_", " ").toLowerCase()}</Badge>
        </div>
        {booking.reservation_expires_at && step !== "DONE" && (
          <p className="mt-3 rounded-xl bg-secondary px-3 py-2 text-xs text-secondary-foreground">
            {t("heldUntil", { date: longDate(booking.reservation_expires_at) })}
          </p>
        )}
      </header>

      {duration && (
        <BookingDatesCard
          booking={booking}
          perDay={quote.perDay}
          total={quote.totalInitialLiability}
          days={duration.days}
          extraHours={duration.extraHours}
          onChanged={refresh}
        />
      )}

      <div className="mt-5 space-y-4">
        {step === "ELIGIBILITY" && (
          <EligibilityStep bookingId={booking.id} onDone={refresh} />
        )}

        {step === "RESERVE" && (
          <StepCard
            icon={<Wallet className="h-5 w-5 text-primary" />}
            title={t("reserveTitle", { amount: rupees(plan.reservation_amount) })}
            body={
              <>
                <p className="text-sm text-muted-foreground">
                  {t("reserveBody", {
                    total: rupees(quote.totalInitialLiability),
                    remaining: rupees(quote.amountAtHub),
                  })}
                </p>
                <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                  {quote.atHub.map((line) => (
                    <li key={line.labelKey}>
                      {t(line.labelKey as TKey, line.labelVars)}: {rupees(line.amount)}
                    </li>
                  ))}
                </ul>
              </>
            }
            action={
              <ActionButton
                label={t("payAndReserve", { amount: rupees(plan.reservation_amount) })}
                run={() => payReservation({ data: { bookingId: booking.id } })}
                onDone={refresh}
              />
            }
          />
        )}

        {step === "TRAVEL" && (
          <StepCard
            icon={<MapPin className="h-5 w-5 text-primary" />}
            title={t("travelTitle")}
            body={
              <div className="text-sm text-muted-foreground">
                <p>
                  {t("hubOpenLine", {
                    name: hub.name,
                    address: hub.address,
                    opens: hub.opens_at,
                    closes: hub.closes_at,
                  })}
                </p>
                <p className="mt-2">
                  {t("carryDocs")}
                </p>
              </div>
            }
            action={
              <div className="flex flex-col gap-2 sm:flex-row">
                <ActionButton
                  label={t("bookRapido")}
                  run={() => setTravelMode({ data: { bookingId: booking.id, mode: "RAPIDO" } })}
                  onDone={refresh}
                />
                <ActionButton
                  variant="outline"
                  label={t("travelSelf")}
                  run={() => setTravelMode({ data: { bookingId: booking.id, mode: "SELF" } })}
                  onDone={refresh}
                />
              </div>
            }
          />
        )}

        {step === "AT_HUB" && (
          <StepCard
            icon={<MapPin className="h-5 w-5 text-primary" />}
            title={t("checkInTitle")}
            body={
              <div className="text-sm text-muted-foreground">
                {booking.rapido_coupon && (
                  <p className="mb-2 rounded-xl bg-accent px-3 py-2 text-accent-foreground">
                    {t("rapidoCoupon", { code: booking.rapido_coupon })}
                  </p>
                )}
                <p>
                  {t("reachHubHint")} ({hub.name})
                </p>
              </div>
            }
            action={
              <ActionButton
                label={t("reachedHub")}
                run={() => checkInAtHub({ data: { bookingId: booking.id } })}
                onDone={refresh}
              />
            }
          />
        )}

        {step === "KYC" && (
          <HubKycStep
            bookingId={booking.id}
            actionRequired={kyc?.status === "ACTION_REQUIRED" ? kyc.action_required_reason : null}
            onDone={refresh}
          />
        )}

        {step === "PAYMENT" && <PaymentStep bookingId={booking.id} onDone={refresh} />}

        {step === "AGREEMENT" && (
          <AgreementStep bookingId={booking.id} onDone={refresh} />
        )}

        {step === "HANDOVER" && (
          <StepCard
            icon={<Bike className="h-5 w-5 text-primary" />}
            title={t("collectTitle")}
            body={
              <div className="text-sm text-muted-foreground">
                <p>{t("handoverHint")}</p>
              </div>
            }
            action={
              <ActionButton
                label={t("receivedBike")}
                run={() => confirmHandover({ data: { bookingId: booking.id } })}
                onDone={async () => {
                  await refresh();
                  navigate({ to: "/my-bike" });
                }}
              />
            }
          />
        )}

        {booking.status === "REJECTED" && (
          <StepCard
            icon={<ShieldAlert className="h-5 w-5 text-destructive" />}
            title={t("rejectedTitle")}
            body={
              <p className="text-sm text-muted-foreground">
                {booking.rejection_reason ?? t("rejectedBody")}
              </p>
            }
            action={
              <Button variant="outline" onClick={() => navigate({ to: "/" })}>
                {t("backToBikes")}
              </Button>
            }
          />
        )}
      </div>
    </AppShell>
  );
}

function EmptyState({ onBrowse }: { onBrowse: () => void }) {
  const { t } = useLanguage();
  return (
    <div className="rounded-2xl border border-border bg-card p-6 text-center">
      <Bike className="mx-auto h-8 w-8 text-primary" />
      <h1 className="mt-3 text-lg font-semibold">{t("noBookingTitle")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("noBookingBody")}</p>
      <Button className="mt-4" onClick={onBrowse}>
        {t("browseBikes")}
      </Button>
    </div>
  );
}

function StepCard({
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

function ActionButton<T>({
  label,
  run,
  onDone,
  variant,
}: {
  label: string;
  run: () => Promise<T>;
  onDone: () => void | Promise<void>;
  variant?: "outline";
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
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
    >
      {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {label}
    </Button>
  );
}

function EligibilityStep({ bookingId, onDone }: { bookingId: string; onDone: () => void }) {
  const { t } = useLanguage();
  const [dlNumber, setDlNumber] = useState("");
  const [dlName, setDlName] = useState("");
  const [dlDob, setDlDob] = useState("");
  const [selfiePath, setSelfiePath] = useState<string | null>(null);
  const [dlFrontPath, setDlFrontPath] = useState<string | null>(null);
  const [dlBackPath, setDlBackPath] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const submit = useMutation({
    mutationFn: () =>
      submitEligibility({
        data: {
          bookingId,
          dlNumber,
          dlName,
          dlDob,
          selfieCaptured: Boolean(selfiePath),
          selfiePath,
          dlFrontPath,
          dlBackPath,
          consent,
          method: "DIGITAL",
        },
      }),
    onSuccess: (data) => {
      setResult(data.result);
      onDone();
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : t("couldNotCheck")),
  });

  if (result) {
    return (
      <StepCard
        icon={<BadgeCheck className="h-5 w-5 text-primary" />}
        title={
          result === "LIKELY_ELIGIBLE" ? t("eligibleTitle") : t("eligibleCloserLook")
        }
        body={
          <p className="text-sm text-muted-foreground">{t("eligibilityIndicative")}</p>
        }
      />
    );
  }

  return (
    <StepCard
      icon={<ClipboardCheck className="h-5 w-5 text-primary" />}
      title={t("eligibilityTitle")}
      body={
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{t("eligibilityHint")}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="dl">{t("dlNumberLabel")}</Label>
              <Input
                id="dl"
                value={dlNumber}
                onChange={(event) => setDlNumber(event.target.value.toUpperCase())}
                placeholder="KA0120150001234"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dlname">{t("nameOnLicence")}</Label>
              <Input
                id="dlname"
                value={dlName}
                onChange={(event) => setDlName(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dob">{t("dateOfBirth")}</Label>
              <Input
                id="dob"
                type="date"
                value={dlDob}
                onChange={(event) => setDlDob(event.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <CaptureField
              bookingId={bookingId}
              slot="dl-front"
              label={t("dlFrontLabel")}
              hint={t("dlFrontHint")}
              value={dlFrontPath}
              onChange={setDlFrontPath}
            />
            <CaptureField
              bookingId={bookingId}
              slot="dl-back"
              label={t("dlBackLabel")}
              hint={t("dlBackHint")}
              value={dlBackPath}
              onChange={setDlBackPath}
            />
            <CaptureField
              bookingId={bookingId}
              slot="selfie"
              label={t("selfieLabel")}
              hint={t("selfieHint")}
              facing="user"
              value={selfiePath}
              onChange={setSelfiePath}
            />
          </div>
          <label className="flex items-start gap-2 text-xs text-muted-foreground">
            <Checkbox
              checked={consent}
              onCheckedChange={(value) => setConsent(value === true)}
              className="mt-0.5"
            />
            <span>{t("eligibilityConsent")}</span>
          </label>
        </div>
      }
      action={
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            className="w-full sm:w-auto"
            onClick={() => submit.mutate()}
            disabled={
              submit.isPending ||
              !consent ||
              dlNumber.length < 10 ||
              !dlName.trim() ||
              !dlFrontPath ||
              !selfiePath
            }
          >
            {submit.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("checkEligibility")}
          </Button>
          <ActionButton
            variant="outline"
            label={t("skipContinue")}
            run={() => skipEligibility({ data: { bookingId } })}
            onDone={onDone}
          />
        </div>
      }
    />
  );
}

function HubKycStep({
  bookingId,
  actionRequired,
  onDone,
}: {
  bookingId: string;
  actionRequired: string | null;
  onDone: () => void;
}) {
  const { t } = useLanguage();
  const [dlNumber, setDlNumber] = useState("");
  const [dlName, setDlName] = useState("");
  const [addressProof, setAddressProof] = useState("");
  const [selfiePath, setSelfiePath] = useState<string | null>(null);
  const [dlFrontPath, setDlFrontPath] = useState<string | null>(null);
  const [dlBackPath, setDlBackPath] = useState<string | null>(null);
  const [addressProofPath, setAddressProofPath] = useState<string | null>(null);

  const submit = useMutation({
    mutationFn: () =>
      submitHubKyc({
        data: {
          bookingId,
          dlNumber,
          dlName,
          addressProof,
          selfieCaptured: Boolean(selfiePath),
          selfiePath,
          dlFrontPath,
          dlBackPath,
          addressProofPath,
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
          <p className="text-sm text-muted-foreground">{t("kycHint")}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="hub-dl">{t("dlNumberLabel")}</Label>
              <Input
                id="hub-dl"
                value={dlNumber}
                onChange={(event) => setDlNumber(event.target.value.toUpperCase())}
                placeholder="KA0120150001234"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hub-name">{t("nameOnLicence")}</Label>
              <Input
                id="hub-name"
                value={dlName}
                onChange={(event) => setDlName(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="proof">{t("addressProofLabel")}</Label>
              <Input
                id="proof"
                value={addressProof}
                onChange={(event) => setAddressProof(event.target.value)}
                placeholder={t("addressProofPlaceholder")}
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <CaptureField
              bookingId={bookingId}
              slot="dl-front"
              label={t("dlFrontLabel")}
              hint={t("dlFrontHint")}
              value={dlFrontPath}
              onChange={setDlFrontPath}
            />
            <CaptureField
              bookingId={bookingId}
              slot="dl-back"
              label={t("dlBackLabel")}
              hint={t("dlBackHint")}
              value={dlBackPath}
              onChange={setDlBackPath}
            />
            <CaptureField
              bookingId={bookingId}
              slot="address-proof"
              label={t("addressProofPhotoLabel")}
              hint={t("addressProofPhotoHint")}
              value={addressProofPath}
              onChange={setAddressProofPath}
            />
            <CaptureField
              bookingId={bookingId}
              slot="selfie"
              label={t("selfieLabel")}
              hint={t("selfieHint")}
              facing="user"
              value={selfiePath}
              onChange={setSelfiePath}
            />
          </div>
          {(!dlFrontPath || !addressProofPath || !selfiePath || !addressProof.trim()) && (
            <p className="text-xs text-muted-foreground">{t("docsPending")}</p>
          )}
        </div>
      }
      action={
        <Button
          className="w-full sm:w-auto"
          onClick={() => submit.mutate()}
          disabled={
            submit.isPending ||
            !dlNumber.trim() ||
            !dlName.trim() ||
            !addressProof.trim() ||
            !dlFrontPath ||
            !addressProofPath ||
            !selfiePath
          }
        >
          {submit.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t("submitDocuments")}
        </Button>
      }
    />
  );
}

function PaymentStep({ bookingId, onDone }: { bookingId: string; onDone: () => void }) {
  const { t } = useLanguage();
  const breakdown = useQuery({
    queryKey: ["final-breakdown", bookingId],
    queryFn: () => getFinalPaymentBreakdown({ data: { bookingId } }),
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

function AgreementStep({ bookingId, onDone }: { bookingId: string; onDone: () => void }) {
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
/** Booked dates, the per-day price, and the one allowed pick-up date change. */
function BookingDatesCard({
  booking,
  perDay,
  total,
  days,
  extraHours,
  onChanged,
}: {
  booking: {
    id: string;
    pickup_on: string | null;
    pickup_slot: string | null;
    dropoff_on: string | null;
    dropoff_slot: string | null;
    original_pickup_on: string | null;
    pickup_change_count: number | null;
  };
  perDay: number | null;
  total: number;
  days: number;
  extraHours: number;
  onChanged: () => void;
}) {
  const { t } = useLanguage();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(booking.pickup_on ?? "");
  const used = (booking.pickup_change_count ?? 0) >= 1;

  const base = booking.original_pickup_on ?? booking.pickup_on;
  const maxDate = base
    ? new Date(new Date(`${base}T00:00:00`).getTime() + MAX_PICKUP_SHIFT_DAYS * 86_400_000)
        .toISOString()
        .slice(0, 10)
    : undefined;

  const change = useMutation({
    mutationFn: () => changePickupDate({ data: { bookingId: booking.id, pickupOn: value } }),
    onSuccess: (result) => {
      if (result.ok) {
        toast.success(t("changePickupDone"));
        setEditing(false);
        onChanged();
      } else {
        toast.error(result.reason === "USED" ? t("changePickupUsed") : t("changePickupTooFar"));
      }
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : t("changePickupTooFar")),
  });

  return (
    <section className="mt-4 rounded-2xl border border-border bg-card p-4">
      <p className="text-sm font-semibold">{t("yourDatesTitle")}</p>
      <dl className="mt-2 space-y-1.5 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">{t("pickupDateLabel")}</dt>
          <dd className="text-right font-medium">
            {longDate(booking.pickup_on)} · {t(slotLabelKey(booking.pickup_slot) as TKey)}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">{t("dropoffDateLabel")}</dt>
          <dd className="text-right font-medium">
            {longDate(booking.dropoff_on)} · {t(slotLabelKey(booking.dropoff_slot) as TKey)}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">{t("daysBilledLabel")}</dt>
          <dd className="font-medium">
            {extraHours > 0
              ? t("daysAndHours", { days, hours: extraHours })
              : t("lineRentDays", { days })}
          </dd>
        </div>
        <div className="flex justify-between gap-4 border-t border-border pt-1.5">
          <dt className="text-muted-foreground">{t("totalToPay")}</dt>
          <dd className="font-semibold">{rupees(total)}</dd>
        </div>
      </dl>
      {perDay !== null && (
        <p className="mt-1 text-right text-xs text-primary">
          {t("perDayApprox", { amount: rupees(perDay) })}
        </p>
      )}

      {used ? (
        <p className="mt-3 text-[11px] text-muted-foreground">{t("changePickupUsed")}</p>
      ) : editing ? (
        <div className="mt-3 space-y-2">
          <Input
            type="date"
            value={value}
            min={booking.pickup_on ?? undefined}
            max={maxDate}
            onChange={(event) => setValue(event.target.value)}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={!value || change.isPending}
              onClick={() => change.mutate()}
            >
              {t("changePickupCta")}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              {t("cancelAction")}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">{t("changePickupHint")}</p>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="mt-3 text-xs font-semibold text-primary underline-offset-2 hover:underline"
        >
          {t("changePickupCta")}
        </button>
      )}
    </section>
  );
}
