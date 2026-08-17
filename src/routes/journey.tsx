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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useRiderSession } from "@/hooks/useRiderSession";
import { getCatalog } from "@/lib/catalog.functions";
import {
  acceptAgreement,
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
import { OTHER_POSSIBLE_CHARGES, buildQuote } from "@/lib/pricing";
import { longDate, modelTitle, rupees } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";

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
    if (!raw) return;
    const selection = JSON.parse(raw) as { modelId: string; hubId: string; planId: string };
    sessionStorage.removeItem("drivex.selection");
    createBooking({ data: selection })
      .then(() => queryClient.invalidateQueries({ queryKey: ["journey"] }))
      .catch((error: unknown) =>
        toast.error(error instanceof Error ? error.message : "Could not start your booking."),
      );
  }, [bootstrapped, session.userId, journey.data, queryClient]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["journey"] });

  if (session.loading || journey.isLoading || catalog.isLoading) {
    return (
      <AppShell subtitle="Your booking">
        <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("loadingBooking")}
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
      <AppShell subtitle="Your booking">
        <EmptyState onBrowse={() => navigate({ to: "/" })} />
      </AppShell>
    );
  }

  if (booking.status === "ACTIVE" || booking.status === "RETURN_REQUESTED") {
    return (
      <AppShell subtitle="Your booking">
        <div className="rounded-2xl border border-border bg-card p-5 text-center">
          <CheckCircle2 className="mx-auto h-8 w-8 text-primary" />
          <h1 className="mt-3 text-xl font-semibold">Your bike is with you</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Everything for this rental now lives in My Bike.
          </p>
          <Button className="mt-4" onClick={() => navigate({ to: "/my-bike" })}>
            Open My Bike
          </Button>
        </div>
      </AppShell>
    );
  }

  const quote = buildQuote(plan);

  return (
    <AppShell subtitle="Your booking">
      <header className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Booking {booking.booking_code}</p>
            <h1 className="mt-1 text-lg font-semibold">
              {modelTitle(model.brand, model.name)}
            </h1>
            <p className="text-sm text-muted-foreground">
              {hub.name} · {plan.plan_type === "RTO" ? "Rent to own" : `${rupees(plan.rental_amount)} / ${plan.billing_period}`}
            </p>
          </div>
          <Badge variant="secondary">{booking.status.replaceAll("_", " ").toLowerCase()}</Badge>
        </div>
        {booking.reservation_expires_at && step !== "DONE" && (
          <p className="mt-3 rounded-xl bg-secondary px-3 py-2 text-xs text-secondary-foreground">
            Your bike is held until {longDate(booking.reservation_expires_at)}.
          </p>
        )}
      </header>

      <div className="mt-5 space-y-4">
        {step === "ELIGIBILITY" && (
          <EligibilityStep bookingId={booking.id} onDone={refresh} />
        )}

        {step === "RESERVE" && (
          <StepCard
            icon={<Wallet className="h-5 w-5 text-primary" />}
            title={`Reserve this bike for ${rupees(plan.reservation_amount)}`}
            body={
              <>
                <p className="text-sm text-muted-foreground">
                  This amount is adjusted against {rupees(quote.totalInitialLiability)} due at the
                  hub, leaving {rupees(quote.amountAtHub)} to pay when you collect the bike.
                </p>
                <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                  {quote.atHub.map((line) => (
                    <li key={line.label}>
                      {line.label}: {rupees(line.amount)}
                    </li>
                  ))}
                </ul>
              </>
            }
            action={
              <ActionButton
                label={`Pay ${rupees(plan.reservation_amount)} and reserve`}
                run={() => payReservation({ data: { bookingId: booking.id } })}
                onDone={refresh}
              />
            }
          />
        )}

        {step === "TRAVEL" && (
          <StepCard
            icon={<MapPin className="h-5 w-5 text-primary" />}
            title="How will you reach the hub?"
            body={
              <div className="text-sm text-muted-foreground">
                <p>
                  {hub.name}, {hub.address}. Open {hub.opens_at}–{hub.closes_at}.
                </p>
                <p className="mt-2">
                  {t("carryDocs")}
                </p>
              </div>
            }
            action={
              <div className="flex flex-col gap-2 sm:flex-row">
                <ActionButton
                  label="Book a Rapido ride"
                  run={() => setTravelMode({ data: { bookingId: booking.id, mode: "RAPIDO" } })}
                  onDone={refresh}
                />
                <ActionButton
                  variant="outline"
                  label="I'll travel on my own"
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
            title="Check in at the hub"
            body={
              <div className="text-sm text-muted-foreground">
                {booking.rapido_coupon && (
                  <p className="mb-2 rounded-xl bg-accent px-3 py-2 text-accent-foreground">
                    Rapido coupon <strong>{booking.rapido_coupon}</strong> — apply it in Rapido for
                    your ride to the hub.
                  </p>
                )}
                <p>
                  {t("reachHubHint")} ({hub.name})
                </p>
              </div>
            }
            action={
              <ActionButton
                label="I've reached the hub"
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
            title="Collect your bike"
            body={
              <div className="text-sm text-muted-foreground">
                <p>{t("handoverHint")}</p>
              </div>
            }
            action={
              <ActionButton
                label="I've received the bike"
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
            title="We can't proceed with this rental"
            body={
              <p className="text-sm text-muted-foreground">
                {booking.rejection_reason ??
                  "Your documents could not be verified for this rental. Your ₹199 reservation will be refunded to the original payment method within 5–7 working days."}
              </p>
            }
            action={
              <Button variant="outline" onClick={() => navigate({ to: "/" })}>
                Back to bikes
              </Button>
            }
          />
        )}
      </div>
    </AppShell>
  );
}

function EmptyState({ onBrowse }: { onBrowse: () => void }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 text-center">
      <Bike className="mx-auto h-8 w-8 text-primary" />
      <h1 className="mt-3 text-lg font-semibold">You don't have a booking yet</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Pick a bike, a hub and a plan to get started.
      </p>
      <Button className="mt-4" onClick={onBrowse}>
        Browse bikes
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
  const mutation = useMutation({
    mutationFn: run,
    onSuccess: async () => {
      await onDone();
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "Something went wrong."),
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
  const [selfie, setSelfie] = useState(false);
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
          selfieCaptured: selfie,
          consent,
          method: "DIGITAL",
        },
      }),
    onSuccess: (data) => {
      setResult(data.result);
      onDone();
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "Could not run the check."),
  });

  if (result) {
    return (
      <StepCard
        icon={<BadgeCheck className="h-5 w-5 text-primary" />}
        title={
          result === "LIKELY_ELIGIBLE"
            ? "You're likely eligible"
            : "We'll need a closer look at the hub"
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
      title="Optional: check your eligibility now"
      body={
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{t("eligibilityHint")}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="dl">Driving Licence number</Label>
              <Input
                id="dl"
                value={dlNumber}
                onChange={(event) => setDlNumber(event.target.value.toUpperCase())}
                placeholder="KA0120150001234"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dlname">Name on licence</Label>
              <Input
                id="dlname"
                value={dlName}
                onChange={(event) => setDlName(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dob">Date of birth</Label>
              <Input
                id="dob"
                type="date"
                value={dlDob}
                onChange={(event) => setDlDob(event.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                variant={selfie ? "secondary" : "outline"}
                className="w-full"
                onClick={() => setSelfie(true)}
              >
                {selfie ? "Selfie captured" : "Capture selfie"}
              </Button>
            </div>
          </div>
          <label className="flex items-start gap-2 text-xs text-muted-foreground">
            <Checkbox
              checked={consent}
              onCheckedChange={(value) => setConsent(value === true)}
              className="mt-0.5"
            />
            <span>
              I authorise DriveX to perform identity, document and rental eligibility checks
              required to process my rental request.
            </span>
          </label>
        </div>
      }
      action={
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            className="w-full sm:w-auto"
            onClick={() => submit.mutate()}
            disabled={submit.isPending || !consent || dlNumber.length < 10 || !dlName.trim()}
          >
            {submit.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Check my eligibility
          </Button>
          <ActionButton
            variant="outline"
            label="Skip and continue"
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
  const [selfie, setSelfie] = useState(false);

  const submit = useMutation({
    mutationFn: () =>
      submitHubKyc({
        data: { bookingId, dlNumber, dlName, addressProof, selfieCaptured: selfie },
      }),
    onSuccess: (data) => {
      if (data.status === "ACTION_REQUIRED") {
        toast.error("Some details need to be captured again.");
      } else {
        toast.success("Your documents are verified.");
      }
      onDone();
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "Could not submit your documents."),
  });

  return (
    <StepCard
      icon={<ClipboardCheck className="h-5 w-5 text-primary" />}
      title="Document verification at the hub"
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
              <Label htmlFor="hub-dl">Driving Licence number</Label>
              <Input
                id="hub-dl"
                value={dlNumber}
                onChange={(event) => setDlNumber(event.target.value.toUpperCase())}
                placeholder="KA0120150001234"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hub-name">Name on licence</Label>
              <Input
                id="hub-name"
                value={dlName}
                onChange={(event) => setDlName(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="proof">Address proof</Label>
              <Input
                id="proof"
                value={addressProof}
                onChange={(event) => setAddressProof(event.target.value)}
                placeholder="Aadhaar / Passport / Utility bill"
              />
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                variant={selfie ? "secondary" : "outline"}
                className="w-full"
                onClick={() => setSelfie(true)}
              >
                {selfie ? "Selfie captured" : "Capture selfie"}
              </Button>
            </div>
          </div>
        </div>
      }
      action={
        <Button
          className="w-full sm:w-auto"
          onClick={() => submit.mutate()}
          disabled={submit.isPending}
        >
          {submit.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Submit documents
        </Button>
      }
    />
  );
}

function PaymentStep({ bookingId, onDone }: { bookingId: string; onDone: () => void }) {
  const breakdown = useQuery({
    queryKey: ["final-breakdown", bookingId],
    queryFn: () => getFinalPaymentBreakdown({ data: { bookingId } }),
  });

  const pay = useMutation({
    mutationFn: (simulateFailure: boolean) =>
      payFinalAmount({ data: { bookingId, simulateFailure } }),
    onSuccess: (data) => {
      if (data.status === "FAILED") {
        toast.error("That payment didn't go through. Your bike is still held — try again.");
      } else {
        toast.success("Payment received.");
        onDone();
      }
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "Payment could not be processed."),
  });

  return (
    <StepCard
      icon={<Wallet className="h-5 w-5 text-primary" />}
      title="Pay the remaining amount"
      body={
        breakdown.isLoading || !breakdown.data ? (
          <p className="text-sm text-muted-foreground">Preparing your payment summary…</p>
        ) : (
          <div className="space-y-3">
            <dl className="space-y-1.5 text-sm">
              {breakdown.data.lines.map((line) => (
                <div key={line.label} className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">{line.label}</dt>
                  <dd className="font-medium">{rupees(line.amount)}</dd>
                </div>
              ))}
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Reservation already paid</dt>
                <dd className="font-medium text-primary">
                  −{rupees(breakdown.data.reservationCredit)}
                </dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-border pt-2 text-base">
                <dt className="font-semibold">Amount due now</dt>
                <dd className="font-semibold">{rupees(breakdown.data.amountDue)}</dd>
              </div>
            </dl>
            <details className="rounded-xl bg-secondary px-3 py-2 text-xs text-secondary-foreground">
              <summary className="cursor-pointer font-medium">Other charges that can apply</summary>
              <ul className="mt-2 list-disc space-y-1 pl-4">
                {OTHER_POSSIBLE_CHARGES.map((item) => (
                  <li key={item}>{item}</li>
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
            Pay now
          </Button>
          <Button
            variant="ghost"
            className="w-full sm:w-auto"
            onClick={() => pay.mutate(true)}
            disabled={pay.isPending}
          >
            Simulate a failed payment
          </Button>
        </div>
      }
    />
  );
}

function AgreementStep({ bookingId, onDone }: { bookingId: string; onDone: () => void }) {
  const [read, setRead] = useState(false);

  return (
    <StepCard
      icon={<ClipboardCheck className="h-5 w-5 text-primary" />}
      title="Accept your rental agreement"
      body={
        <div className="space-y-3">
          <div className="max-h-52 overflow-y-auto rounded-xl border border-border bg-background p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">DriveX rental agreement (summary)</p>
            <p className="mt-2">
              You agree to use the vehicle lawfully, keep it in the condition recorded at handover,
              and return it to the agreed hub at the end of your rental period.
            </p>
            <p className="mt-2">
              Rental payments are due on the scheduled date. Late payments attract the late fee
              disclosed in your plan. Traffic challans issued during your rental are payable by you.
            </p>
            <p className="mt-2">
              Kilometres beyond your plan allowance are charged at the per-kilometre rate shown in
              your plan. Damage identified at return inspection is charged against your security
              deposit, with photo evidence from handover and return shared with you.
            </p>
            <p className="mt-2">
              Mandatory servicing must be completed at a DriveX hub at the interval shown in the
              app. Riding an overdue vehicle can affect your damage liability.
            </p>
          </div>
          <label className="flex items-start gap-2 text-xs text-muted-foreground">
            <Checkbox
              checked={read}
              onCheckedChange={(value) => setRead(value === true)}
              className="mt-0.5"
            />
            <span>I have read and accept the rental agreement.</span>
          </label>
        </div>
      }
      action={
        read ? (
          <ActionButton
            label="Accept and continue"
            run={() => acceptAgreement({ data: { bookingId } })}
            onDone={onDone}
          />
        ) : (
          <Button disabled className="w-full sm:w-auto">
            Accept and continue
          </Button>
        )
      }
    />
  );
}