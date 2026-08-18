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
import { PageLoader } from "@/components/drivex/PageLoader";
import { CaptureField } from "@/components/drivex/CaptureField";
import {
  EMPTY_ID_DOCS,
  IdDocumentFields,
  IdMethodPicker,
  PendingConfirmation,
  type IdDocState,
} from "@/components/drivex/IdDocuments";
import { eligibilityDocsComplete, type EligibilityMethod } from "@/lib/eligibility";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useRiderSession } from "@/hooks/useRiderSession";
import { getCatalog } from "@/lib/catalog.functions";
import {
  changePickupDate,
  checkInAtHub,
  confirmHandover,
  createBooking,
  getJourney,
  getSavedDocuments,
  payReservation,
  setTravelMode,
  skipEligibility,
  submitEligibility,
} from "@/lib/booking.functions";
import {
  MAX_PICKUP_SHIFT_DAYS,
  addonRates,
  buildQuote,
  computeDuration,
  isHelmetMode,
  slotLabelKey,
} from "@/lib/pricing";
import {
  ActionButton,
  AgreementStep,
  HubKycStep,
  PaymentStep,
  StepCard,
} from "@/components/drivex/HubSteps";
import { ReservationConfirmed } from "@/components/drivex/ReservationConfirmed";
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
    case "ELIGIBILITY_STARTED":
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
    case "APPROVED":
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
    return <PageLoader message={creating ? t("preparingBooking") : t("loadingBooking")} />;
  }

  const booking = journey.data?.booking ?? null;
  const kyc = journey.data?.kyc ?? null;
  const step = stepFor(booking?.status);
  const plan = catalog.data?.plans.find((row) => row.id === booking?.plan_id) ?? null;
  const model = catalog.data?.models.find((row) => row.id === booking?.model_id) ?? null;
  const hub = catalog.data?.hubs.find((row) => row.id === booking?.hub_id) ?? null;

  // Only a missing booking is an empty state — a booking whose plan/model/hub
  // row we can't resolve must still be resumable.
  if (!booking) {
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
  const quote = plan
    ? buildQuote(plan, duration, {
        mode: isHelmetMode(booking.extra_helmet_mode) ? booking.extra_helmet_mode : "NONE",
        amount: booking.extra_helmet_amount ?? 0,
      })
    : null;

  return (
    <AppShell subtitle={t("subtitleBooking")}>
      <header className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">
              {t("bookingLabel", { code: booking.booking_code })}
            </p>
            <h1 className="mt-1 text-lg font-semibold">
              {model ? modelTitle(model.brand, model.name) : t("subtitleBooking")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {[
                hub?.name,
                plan
                  ? plan.plan_type === "RTO"
                    ? t("planRto")
                    : `${rupees(plan.rental_amount)} / ${plan.billing_period}`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")}
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

      {duration && quote && (
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
        {(step === "TRAVEL" || step === "AT_HUB") && (
          <ReservationConfirmed
            bookingCode={booking.booking_code}
            modelName={model ? modelTitle(model.brand, model.name) : t("subtitleBooking")}
            hubName={hub?.name ?? null}
            hubAddress={hub?.address ?? null}
            paidAmount={plan?.reservation_amount ?? 199}
            amountAtHub={quote ? quote.amountAtHub : null}
            rapidoCoupon={booking.rapido_coupon}
            onRevealCoupon={async () => {
              await setTravelMode({ data: { bookingId: booking.id, mode: "RAPIDO" } });
              refresh();
            }}
          />
        )}

        {step === "ELIGIBILITY" && (
          <EligibilityStep bookingId={booking.id} onDone={refresh} />
        )}

        {step === "RESERVE" && plan && quote && (
          <ReserveStep
            bookingId={booking.id}
            reservationAmount={plan.reservation_amount}
            quote={quote}
            verificationDone={booking.status !== "ELIGIBILITY_SKIPPED"}
            onDone={refresh}
          />
        )}

        {step === "TRAVEL" && hub && (
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
                  variant="outline"
                  label={t("travelSelf")}
                  run={() => setTravelMode({ data: { bookingId: booking.id, mode: "SELF" } })}
                  onDone={refresh}
                />
              </div>
            }
          />
        )}

        {step === "AT_HUB" && hub && (
          <StepCard
            icon={<MapPin className="h-5 w-5 text-primary" />}
            title={t("checkInTitle")}
            body={
              <div className="text-sm text-muted-foreground">
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
            savedVerification={journey.data?.profile?.kycReusable ?? false}
            actionRequired={kyc?.status === "ACTION_REQUIRED" ? kyc.action_required_reason : null}
            onDone={refresh}
          />
        )}

        {step === "PAYMENT" && (
          <PaymentStep
            bookingId={booking.id}
            plan={plan}
            duration={duration}
            rates={addonRates(catalog.data?.addons)}
            onDone={refresh}
          />
        )}

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


function ReserveStep({
  bookingId,
  reservationAmount,
  quote,
  verificationDone,
  onDone,
}: {
  bookingId: string;
  reservationAmount: number;
  quote: ReturnType<typeof buildQuote>;
  verificationDone: boolean;
  onDone: () => void;
}) {
  const { t } = useLanguage();
  // Verification is optional before reserving, so the rider must knowingly
  // accept that the ₹199 hold is not returned if the hub check does not pass.
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  return (
    <StepCard
      icon={<Wallet className="h-5 w-5 text-primary" />}
      title={t("reserveTitle", { amount: rupees(reservationAmount) })}
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
          {!verificationDone && (
            <p className="mt-3 flex items-start gap-2 rounded-xl bg-secondary px-3 py-2 text-xs text-secondary-foreground">
              <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <span>{t("hubVerificationRisk")}</span>
            </p>
          )}
          <label className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
            <Checkbox
              checked={acceptedTerms}
              onCheckedChange={(value) => setAcceptedTerms(value === true)}
              className="mt-0.5"
            />
            <span>{t("reservationTermsConsent")}</span>
          </label>
        </>
      }
      action={
        <div className="flex flex-col gap-2">
          <ActionButton
            label={t("payAndReserve", { amount: rupees(reservationAmount) })}
            run={() => payReservation({ data: { bookingId, acceptedTerms } })}
            onDone={onDone}
            disabled={!acceptedTerms}
          />
          {!acceptedTerms && (
            <p className="text-xs text-muted-foreground">{t("acceptTermsRequired")}</p>
          )}
        </div>
      }
    />
  );
}

function EligibilityStep({ bookingId, onDone }: { bookingId: string; onDone: () => void }) {
  const { t } = useLanguage();
  const saved = useQuery({ queryKey: ["saved-docs"], queryFn: () => getSavedDocuments() });
  const [docs, setDocs] = useState<IdDocState>(EMPTY_ID_DOCS);
  const [method, setMethod] = useState<EligibilityMethod>("UPLOAD");
  const [prefilled, setPrefilled] = useState(false);
  const [consent, setConsent] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  /** Lets a rider replace an ID we already hold instead of being stuck on it. */
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!saved.data || prefilled) return;
    const map = saved.data;
    setDocs((old) => ({
      aadhaarFrontPath: old.aadhaarFrontPath ?? map["aadhaar-front"] ?? null,
      aadhaarBackPath: old.aadhaarBackPath ?? map["aadhaar-back"] ?? null,
      dlFrontPath: old.dlFrontPath ?? map["dl-front"] ?? null,
      dlBackPath: old.dlBackPath ?? map["dl-back"] ?? null,
      panPath: old.panPath ?? map["pan"] ?? null,
    }));
    setPrefilled(true);
  }, [saved.data, prefilled]);

  const submit = useMutation({
    mutationFn: () =>
      submitEligibility({
        data: {
          bookingId,
          ...docs,
          consent,
          method,
        },
      }),
    onSuccess: (data) => {
      setResult(data.result);
      setEditing(false);
      onDone();
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : t("couldNotCheck")),
  });

  const docsReady = eligibilityDocsComplete(docs);

  if (result) {
    return (
      <StepCard
        icon={<BadgeCheck className="h-5 w-5 text-primary" />}
        title={
          result === "LIKELY_ELIGIBLE" ? t("eligibleTitle") : t("eligibleCloserLook")
        }
        body={
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{t("eligibilityIndicative")}</p>
            <Button variant="ghost" className="px-0" onClick={() => { setResult(null); setEditing(true); }}>
              {t("editDocuments")}
            </Button>
          </div>
        }
      />
    );
  }

  // IDs already on file, no verdict yet: say so instead of asking again.
  if (docsReady && !editing && prefilled && !submit.isPending) {
    return (
      <StepCard
        icon={<ClipboardCheck className="h-5 w-5 text-primary" />}
        title={t("eligibilityTitle")}
        body={
          <div className="space-y-3">
            <PendingConfirmation />
            <p className="text-xs text-muted-foreground">{t("eligibilityDocsSaved")}</p>
          </div>
        }
        action={
          <div className="flex flex-col gap-2 sm:flex-row-reverse sm:justify-start">
            <ActionButton
              label={t("reserveNowVerifyAtHub")}
              run={() => skipEligibility({ data: { bookingId } })}
              onDone={onDone}
            />
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setEditing(true)}>
              {t("editDocuments")}
            </Button>
          </div>
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
          <p className="rounded-xl bg-secondary px-3 py-2 text-xs text-secondary-foreground">
            {t("eligibilityOptionalNote")} {t("hubVerificationRisk")}
          </p>
          <IdMethodPicker method={method} onMethod={setMethod} />
          <div>
            <p className="text-sm font-medium">{t("idDocsTitle")}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("idDocsHint")}</p>
          </div>
          <IdDocumentFields
            bookingId={bookingId}
            docs={docs}
            onChange={(next) => setDocs((old) => ({ ...old, ...next }))}
          />
          <label className="flex items-start gap-2 text-xs text-muted-foreground">
            <Checkbox
              checked={consent}
              onCheckedChange={(value) => setConsent(value === true)}
              className="mt-0.5"
            />
            <span>
              {t("eligibilityConsent")} {t("documentConsent")}
            </span>
          </label>
        </div>
      }
      action={
        <div className="flex flex-col gap-2 sm:flex-row-reverse sm:justify-start">
          <ActionButton
            label={t("reserveNowVerifyAtHub")}
            run={() => skipEligibility({ data: { bookingId } })}
            onDone={onDone}
          />
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => submit.mutate()}
            disabled={
              submit.isPending ||
              !consent ||
              !docsReady
            }
          >
            {submit.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("checkEligibility")}
          </Button>
        </div>
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
