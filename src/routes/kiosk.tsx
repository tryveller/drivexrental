import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Bike,
  CheckCircle2,
  ClipboardCheck,
  LogOut,
  MapPin,
  ShieldAlert,
  Wallet,
} from "lucide-react";

import { BookingQr } from "@/components/drivex/BookingQr";
import { DriveXLogo } from "@/components/drivex/DriveXLogo";
import { PageLoader } from "@/components/drivex/PageLoader";
import { PhoneLoginDialog } from "@/components/drivex/PhoneLoginDialog";
import {
  ActionButton,
  AgreementStep,
  HubKycStep,
  PaymentStep,
  StepCard,
} from "@/components/drivex/HubSteps";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useRiderSession } from "@/hooks/useRiderSession";
import { getCatalog } from "@/lib/catalog.functions";
import { checkInAtHub, confirmHandover, getJourney } from "@/lib/booking.functions";
import { addonRates, computeDuration, slotLabelKey } from "@/lib/pricing";
import { kioskLink } from "@/lib/booking-share";
import { longDate, modelTitle } from "@/lib/format";
import { useLanguage, type TKey } from "@/lib/i18n";

export const Route = createFileRoute("/kiosk")({
  head: () => ({
    meta: [
      { title: "DriveX hub kiosk — pick up your bike" },
      {
        name: "description",
        content:
          "Hub pickup screen: finish verification, see eligibility remarks, pay the pending amount, accept the agreement and collect your DriveX bike.",
      },
      { property: "og:title", content: "DriveX hub kiosk" },
      {
        property: "og:description",
        content: "Finish verification, pay the balance and collect your reserved bike at the hub.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: KioskPage,
});

type KioskStage = "CHECK_IN" | "KYC" | "BLOCKED" | "PAYMENT" | "AGREEMENT" | "HANDOVER" | "DONE";

function stageFor(status: string | undefined): KioskStage {
  switch (status) {
    case "RESERVED":
    case "TRAVEL_TO_HUB":
      return "CHECK_IN";
    case "AT_HUB":
    case "KYC_IN_PROGRESS":
      return "KYC";
    case "REJECTED":
      return "BLOCKED";
    case "APPROVED":
    case "FINAL_PAYMENT_PENDING":
      return "PAYMENT";
    case "PAID":
      return "AGREEMENT";
    case "AGREEMENT_ACCEPTED":
    case "VEHICLE_ASSIGNED":
    case "HANDOVER_PENDING":
      return "HANDOVER";
    default:
      return "DONE";
  }
}

const STAGE_ORDER: KioskStage[] = ["CHECK_IN", "KYC", "PAYMENT", "AGREEMENT", "HANDOVER"];
const STAGE_LABEL: Record<string, TKey> = {
  CHECK_IN: "kioskStageCheckIn",
  KYC: "kioskStageKyc",
  PAYMENT: "kioskStagePayment",
  AGREEMENT: "kioskStageAgreement",
  HANDOVER: "kioskStageHandover",
};

function KioskPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const session = useRiderSession();
  const queryClient = useQueryClient();
  const [loginOpen, setLoginOpen] = useState(true);

  const journey = useQuery({
    queryKey: ["journey"],
    queryFn: () => getJourney(),
    enabled: Boolean(session.userId),
  });
  const catalog = useQuery({ queryKey: ["catalog"], queryFn: () => getCatalog() });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["journey"] });

  async function endSession() {
    await supabase.auth.signOut();
    queryClient.clear();
    setLoginOpen(true);
  }

  if (session.loading || (session.userId && (journey.isLoading || catalog.isLoading))) {
    return <PageLoader message={t("loadingBooking")} />;
  }

  if (!session.userId) {
    return (
      <KioskFrame>
        <div className="mx-auto max-w-xl rounded-3xl border border-border bg-card p-10 text-center">
          <ClipboardCheck className="mx-auto h-14 w-14 text-primary" />
          <h1 className="mt-5 text-3xl font-semibold">{t("kioskSignInTitle")}</h1>
          <p className="mt-3 text-lg text-muted-foreground">{t("kioskSignInBody")}</p>
          <Button size="lg" className="mt-6 h-14 px-8 text-lg" onClick={() => setLoginOpen(true)}>
            {t("kioskStartCta")}
          </Button>
        </div>
        <PhoneLoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
      </KioskFrame>
    );
  }

  const booking = journey.data?.booking ?? null;
  const kyc = journey.data?.kyc ?? null;
  const vehicle = journey.data?.vehicle ?? null;

  if (!booking) {
    return (
      <KioskFrame onEnd={endSession}>
        <div className="mx-auto max-w-xl rounded-3xl border border-border bg-card p-10 text-center">
          <Bike className="mx-auto h-14 w-14 text-primary" />
          <h1 className="mt-5 text-2xl font-semibold">{t("noBookingTitle")}</h1>
          <p className="mt-3 text-lg text-muted-foreground">{t("kioskNoBookingBody")}</p>
        </div>
      </KioskFrame>
    );
  }

  const plan = catalog.data?.plans.find((row) => row.id === booking.plan_id) ?? null;
  const model = catalog.data?.models.find((row) => row.id === booking.model_id) ?? null;
  const hub = catalog.data?.hubs.find((row) => row.id === booking.hub_id) ?? null;
  const stage = stageFor(booking.status);
  const duration = computeDuration(
    booking.pickup_on,
    booking.pickup_slot,
    booking.dropoff_on,
    booking.dropoff_slot,
  );

  return (
    <KioskFrame onEnd={endSession}>
      <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
        <aside className="space-y-4">
          <section className="rounded-3xl border border-primary/30 bg-card p-6">
            <p className="text-sm uppercase tracking-[0.18em] text-muted-foreground">
              {t("kioskBookingLabel")}
            </p>
            <p className="mt-1 text-3xl font-semibold tracking-[0.12em] text-primary">
              {booking.booking_code}
            </p>
            <h1 className="mt-4 text-xl font-semibold">
              {model ? modelTitle(model.brand, model.name) : t("subtitleBooking")}
            </h1>
            <dl className="mt-4 space-y-2 text-sm">
              <Row label={t("pickupDateLabel")}>
                {longDate(booking.pickup_on)} · {t(slotLabelKey(booking.pickup_slot) as TKey)}
              </Row>
              <Row label={t("dropoffDateLabel")}>
                {longDate(booking.dropoff_on)} · {t(slotLabelKey(booking.dropoff_slot) as TKey)}
              </Row>
              {plan && (
                <Row label={t("planLabel")}>
                  {plan.plan_type === "RTO" ? t("planRto") : plan.billing_period}
                </Row>
              )}
              {hub && <Row label={t("hubLabel")}>{hub.name}</Row>}
            </dl>
            <Badge variant="secondary" className="mt-4">
              {booking.status.replaceAll("_", " ").toLowerCase()}
            </Badge>
          </section>

          <section className="flex items-center gap-4 rounded-3xl border border-border bg-card p-5">
            <BookingQr value={kioskLink(booking.booking_code)} size={120} />
            <div>
              <p className="text-sm font-semibold">{t("bookingQrTitle")}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t("bookingQrBody")}</p>
            </div>
          </section>

          <ol className="space-y-2 rounded-3xl border border-border bg-card p-5">
            {STAGE_ORDER.map((item, index) => {
              const position = STAGE_ORDER.indexOf(stage);
              const done = stage === "DONE" || (position > -1 && index < position);
              const active = item === stage;
              return (
                <li key={item} className="flex items-center gap-3 text-sm">
                  <span
                    className={
                      "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold " +
                      (done
                        ? "bg-primary text-primary-foreground"
                        : active
                          ? "bg-primary/20 text-primary"
                          : "bg-muted text-muted-foreground")
                    }
                  >
                    {done ? "✓" : index + 1}
                  </span>
                  <span className={active ? "font-semibold" : "text-muted-foreground"}>
                    {t(STAGE_LABEL[item] as TKey)}
                  </span>
                </li>
              );
            })}
          </ol>
        </aside>

        <div className="space-y-5 text-[1.05rem] [&_h2]:text-xl">
          {stage === "CHECK_IN" && (
            <StepCard
              icon={<MapPin className="h-5 w-5 text-primary" />}
              title={t("kioskCheckInTitle")}
              body={
                <p className="text-base text-muted-foreground">
                  {t("kioskCheckInBody", { hub: hub?.name ?? "" })}
                </p>
              }
              action={
                <ActionButton
                  label={t("kioskCheckInCta")}
                  run={() => checkInAtHub({ data: { bookingId: booking.id } })}
                  onDone={refresh}
                />
              }
            />
          )}

          {stage === "KYC" && (
            <HubKycStep
              bookingId={booking.id}
              savedVerification={journey.data?.profile?.kycReusable ?? false}
              actionRequired={kyc?.status === "ACTION_REQUIRED" ? kyc.action_required_reason : null}
              onDone={refresh}
            />
          )}

          {stage === "BLOCKED" && (
            <StepCard
              icon={<ShieldAlert className="h-5 w-5 text-destructive" />}
              title={t("kioskNotEligibleTitle")}
              body={
                <div className="space-y-3">
                  <p className="rounded-xl bg-destructive/10 px-4 py-3 text-base text-destructive">
                    {booking.rejection_reason ?? kyc?.rejection_reason ?? t("rejectedBody")}
                  </p>
                  <p className="text-sm text-muted-foreground">{t("kioskNotEligibleBody")}</p>
                </div>
              }
              action={
                <Button variant="outline" onClick={endSession}>
                  {t("kioskFinishCta")}
                </Button>
              }
            />
          )}

          {stage === "PAYMENT" && (
            <>
              <StepCard
                icon={<Wallet className="h-5 w-5 text-primary" />}
                title={t("kioskEligibleTitle")}
                body={<p className="text-base text-muted-foreground">{t("kioskEligibleBody")}</p>}
              />
              <PaymentStep
                bookingId={booking.id}
                plan={plan}
                duration={duration}
                rates={addonRates(catalog.data?.addons)}
                onDone={refresh}
              />
            </>
          )}

          {stage === "AGREEMENT" && <AgreementStep bookingId={booking.id} onDone={refresh} />}

          {stage === "HANDOVER" && (
            <StepCard
              icon={<Bike className="h-5 w-5 text-primary" />}
              title={t("kioskBikeReadyTitle")}
              body={
                <div className="space-y-4">
                  <div className="rounded-2xl bg-primary/10 p-6 text-center">
                    <p className="text-sm uppercase tracking-[0.18em] text-muted-foreground">
                      {t("kioskRegLabel")}
                    </p>
                    <p className="mt-1 text-4xl font-semibold tracking-[0.12em]">
                      {vehicle?.registration_number ?? "—"}
                    </p>
                    <p className="mt-3 text-sm text-muted-foreground">
                      {t("kioskBikeReadyBody", {
                        code: booking.booking_code,
                        hub: hub?.name ?? "",
                      })}
                    </p>
                  </div>
                  {vehicle && (
                    <dl className="grid gap-2 sm:grid-cols-3">
                      <Row label={t("odometerLabel")}>{vehicle.odometer_km} km</Row>
                      <Row label={t("fuelLabel")}>{vehicle.fuel_percent}%</Row>
                      <Row label={t("conditionLabel")}>{vehicle.condition}</Row>
                    </dl>
                  )}
                </div>
              }
              action={
                <ActionButton
                  label={t("kioskHandoverCta")}
                  run={() => confirmHandover({ data: { bookingId: booking.id } })}
                  onDone={refresh}
                />
              }
            />
          )}

          {stage === "DONE" && (
            <StepCard
              icon={<CheckCircle2 className="h-5 w-5 text-primary" />}
              title={t("kioskDoneTitle")}
              body={<p className="text-base text-muted-foreground">{t("kioskDoneBody")}</p>}
              action={
                <div className="flex flex-wrap gap-3">
                  <Button onClick={() => navigate({ to: "/my-bike" })}>{t("openMyBike")}</Button>
                  <Button variant="outline" onClick={endSession}>
                    {t("kioskFinishCta")}
                  </Button>
                </div>
              }
            />
          )}
        </div>
      </div>
    </KioskFrame>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 rounded-lg bg-secondary/40 px-3 py-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  );
}

/** Full-bleed, touch-sized shell for the hub's large screen. */
function KioskFrame({
  children,
  onEnd,
}: {
  children: React.ReactNode;
  onEnd?: () => void | Promise<void>;
}) {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-card/60 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <DriveXLogo className="h-10 w-10" />
            <div>
              <p className="text-lg font-semibold leading-tight">{t("kioskTitle")}</p>
              <p className="text-xs text-muted-foreground">{t("kioskSubtitle")}</p>
            </div>
          </div>
          {onEnd && (
            <Button variant="outline" size="lg" onClick={() => void onEnd()}>
              <LogOut className="mr-2 h-4 w-4" />
              {t("kioskFinishCta")}
            </Button>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
