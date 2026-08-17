import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Loader2, MapPin, Navigation, Clock, Sparkles, ChevronRight } from "lucide-react";

import { AppShell } from "@/components/drivex/AppShell";
import { PlanCard } from "@/components/drivex/PlanCard";
import { BikeCard } from "@/components/drivex/BikeCard";
import { DatesStep, defaultDates, type RideDates } from "@/components/drivex/DatesStep";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { modelTitle, rupees } from "@/lib/format";
import { getCatalog, type CatalogVehicle } from "@/lib/catalog.functions";
import { computeConditionScore, computeDuration, distanceKm, planDayRate } from "@/lib/pricing";
import { bestInClass } from "@/lib/bike-specs";
import { useLanguage } from "@/lib/i18n";
import { useRiderLocation } from "@/lib/location";
import bannerImage from "@/assets/drivex-banner.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DriveX — Rent a two-wheeler near you in Bengaluru" },
      {
        name: "description",
        content:
          "Reserve a scooter or bike for ₹199, pick weekly, monthly or rent-to-own plans, and collect it from your nearest DriveX hub.",
      },
      { property: "og:title", content: "DriveX — Rent a two-wheeler near you" },
      {
        property: "og:description",
        content:
          "Weekly, monthly and rent-to-own two-wheeler rentals in Bengaluru. Reserve for ₹199, adjusted against what you pay at the hub.",
      },
    ],
  }),
  component: Discovery,
});

function Discovery() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { location, clearLocation } = useRiderLocation();
  const catalog = useQuery({ queryKey: ["catalog"], queryFn: () => getCatalog() });

  const [modelId, setModelId] = useState<string | null>(null);
  const [planId, setPlanId] = useState<string | null>(null);
  const [planSheetOpen, setPlanSheetOpen] = useState(false);
  const [showRto, setShowRto] = useState(false);
  const [dates, setDates] = useState<RideDates>(() => defaultDates());

  const coords = location?.coords ?? null;
  const locality = location?.locality ?? "";
  const locationLabel = locality || location?.pinCode || t("nearMe");

  // V1 launches from a single hub: the one nearest the rider.
  const hub = useMemo(() => {
    const list = catalog.data?.hubs ?? [];
    const withDistance = list.map((item) => ({
      ...item,
      distance: coords ? distanceKm(coords, { lat: item.latitude, lng: item.longitude }) : null,
    }));
    if (coords) {
      return withDistance.sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0))[0] ?? null;
    }
    const matched = withDistance.find((item) => item.locality === locality);
    return matched ?? withDistance[0] ?? null;
  }, [catalog.data, coords, locality]);

  // One best-condition vehicle per model, so each bike is shown once with
  // the real service history a rider would ride away with.
  const bikes = useMemo(() => {
    if (!hub) return [];
    const models = catalog.data?.models ?? [];
    const plans = catalog.data?.plans ?? [];
    const best = new Map<string, CatalogVehicle>();
    const counts = new Map<string, number>();
    for (const vehicle of catalog.data?.vehicles ?? []) {
      if (vehicle.hub_id !== hub.id) continue;
      counts.set(vehicle.model_id, (counts.get(vehicle.model_id) ?? 0) + 1);
      const current = best.get(vehicle.model_id);
      if (
        !current ||
        computeConditionScore(vehicle).score > computeConditionScore(current).score
      ) {
        best.set(vehicle.model_id, vehicle);
      }
    }
    return [...best.entries()].flatMap(([id, vehicle]) => {
      const model = models.find((item) => item.id === id);
      if (!model) return [];
      const modelPlans = plans.filter(
        (plan) => plan.model_id === model.id || plan.model_id === null,
      );
      const cheapest = modelPlans.reduce<(typeof modelPlans)[number] | null>(
        (min, plan) => (min === null || plan.rental_amount < min.rental_amount ? plan : min),
        null,
      );
      return [{ model, vehicle, plans: modelPlans, cheapest, units: counts.get(id) ?? 0 }];
    });
  }, [hub, catalog.data]);

  const badges = useMemo(
    () => bestInClass(bikes.map((row) => row.model)),
    [bikes],
  );

  const selected = bikes.find((row) => row.model.id === modelId) ?? null;
  const planOrder: Record<string, number> = { DAILY: 0, WEEKLY: 1, MONTHLY: 2 };
  const rentalPlans = [...(selected?.plans ?? [])]
    .filter((plan) => plan.plan_type !== "RTO")
    .sort((a, b) => (planOrder[a.plan_type] ?? 9) - (planOrder[b.plan_type] ?? 9));
  const rtoPlans = (selected?.plans ?? []).filter((plan) => plan.plan_type === "RTO");
  const plans = showRto ? rtoPlans : rentalPlans;
  const chosenPlan = plans.find((plan) => plan.id === planId) ?? null;
  const needsDates = Boolean(chosenPlan) && chosenPlan?.plan_type !== "RTO";
  const duration = computeDuration(
    dates.pickupOn,
    dates.pickupSlot,
    dates.dropoffOn,
    dates.dropoffSlot,
  );
  const canContinue = Boolean(planId) && (!needsDates || duration !== null);

  function continueToReserve() {
    if (!modelId || !hub || !planId) return;
    sessionStorage.setItem(
      "drivex.selection",
      JSON.stringify({ modelId, hubId: hub.id, planId, ...(needsDates ? dates : {}) }),
    );
    navigate({ to: "/auth" });
  }

  if (catalog.isLoading) {
    return (
      <AppShell>
        <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("findingBikes")}
        </div>
      </AppShell>
    );
  }

  const mapsUrl = hub
    ? `https://www.google.com/maps/search/?api=1&query=${hub.latitude},${hub.longitude}`
    : "#";

  return (
    <AppShell>
      <section className="relative overflow-hidden rounded-3xl border border-primary/25">
        <img
          src={bannerImage}
          alt="Orange and black scooter lit by warm rim light"
          width={1536}
          height={768}
          className="h-56 w-full object-cover sm:h-72"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/10" />
        <div className="absolute inset-x-0 bottom-0 p-5">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {t("bannerHeadline")}
          </h1>
          <button
            type="button"
            onClick={clearLocation}
            className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-background/60 px-3 py-1.5 text-xs font-medium backdrop-blur"
          >
            <MapPin className="h-3.5 w-3.5 text-primary" />
            {locationLabel}
          </button>
        </div>
      </section>

      {hub && (
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex items-center gap-3 rounded-2xl border border-border bg-card/70 px-4 py-3 backdrop-blur transition-colors hover:border-primary/50"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15">
            <MapPin className="h-5 w-5 text-primary" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">
              {t("hubNamed", { locality: hub.locality })}
            </span>
            <span className="mt-0.5 flex items-center gap-1.5 whitespace-nowrap text-[11px] text-muted-foreground">
              <Clock className="h-3 w-3" />
              {hub.opens_at.slice(0, 5)}–{hub.closes_at.slice(0, 5)}
            </span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground">
            <Navigation className="h-3 w-3" />
            {hub.distance !== null ? `${hub.distance} km` : t("openInMaps")}
          </span>
        </a>
      )}

      <section className="mt-5">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold">{t("compareHint")}</h2>
          <span className="text-[11px] text-muted-foreground">{t("allChecked")}</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {bikes.map((row) => (
            <BikeCard
              key={row.model.id}
              model={row.model}
              vehicle={row.vehicle}
              fromAmount={row.cheapest?.rental_amount ?? null}
              fromPeriod={row.cheapest?.billing_period ?? null}
              unitsReady={row.units}
              badges={badges[row.model.name] ?? []}
              selected={modelId === row.model.id}
              onSelect={() => {
                setModelId(row.model.id);
                setPlanId(null);
                setShowRto(false);
                setPlanSheetOpen(true);
              }}
            />
          ))}
        </div>
      </section>

      <Dialog open={planSheetOpen && Boolean(selected)} onOpenChange={setPlanSheetOpen}>
        <DialogContent className="max-h-[92vh] max-w-lg gap-0 overflow-y-auto p-0">
          <DialogHeader className="px-5 pt-5 text-left">
            <DialogTitle>
              {needsDates ? t("datesTitle") : showRto ? t("rtoTitle") : t("choosePlan")}
            </DialogTitle>
            <DialogDescription>
              {selected ? modelTitle(selected.model.brand, selected.model.name) : ""}
            </DialogDescription>
          </DialogHeader>

          {!needsDates && (
            <div className="mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {plans.map((plan) => (
                <div key={plan.id} className="w-[82%] max-w-sm shrink-0 snap-center">
                  <PlanCard
                    plan={plan}
                    selected={planId === plan.id}
                    onSelect={() => setPlanId(plan.id)}
                  />
                </div>
              ))}
            </div>
          )}

          {needsDates && chosenPlan && (
            <div className="px-5 pb-4 pt-3">
              <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3">
                <span className="min-w-0 text-sm">
                  <span className="block font-semibold">
                    {t("selectedPlanLabel", {
                      plan: t(
                        chosenPlan.plan_type === "DAILY"
                          ? "planDaily"
                          : chosenPlan.plan_type === "WEEKLY"
                            ? "planWeekly"
                            : "planMonthly",
                      ),
                    })}
                  </span>
                  <span className="block text-[11px] text-muted-foreground">
                    {t("perDayApprox", { amount: rupees(planDayRate(chosenPlan)) })}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setPlanId(null)}
                  className="shrink-0 text-xs font-semibold text-primary underline"
                >
                  {t("changePlanAction")}
                </button>
              </div>
              <DatesStep plan={chosenPlan} value={dates} onChange={setDates} />
            </div>
          )}

          {!needsDates && rtoPlans.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setShowRto((value) => !value);
                setPlanId(null);
              }}
              className="mx-5 mb-4 flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3 text-left transition-colors hover:border-primary/60"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15">
                <Sparkles className="h-4 w-4 text-primary" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">
                  {showRto ? t("rtoBack") : t("rtoTitle")}
                </span>
                <span className="block text-[11px] text-muted-foreground">
                  {showRto ? t("choosePlan") : t("rtoHint")}
                </span>
              </span>
              <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-primary" />
            </button>
          )}

          <div className="sticky bottom-0 border-t border-border bg-card/95 p-4 backdrop-blur">
            <Button
              className="w-full"
              size="lg"
              disabled={!canContinue}
              onClick={continueToReserve}
            >
              {planId ? t("continueReserve") : t("pickDatesFirst")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
