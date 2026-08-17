import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Loader2, MapPin, Bike as BikeIcon } from "lucide-react";

import { AppShell } from "@/components/drivex/AppShell";
import { PlanCard } from "@/components/drivex/PlanCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getCatalog } from "@/lib/catalog.functions";
import { distanceKm } from "@/lib/pricing";
import { modelTitle, rupees } from "@/lib/format";
import { cn } from "@/lib/utils";
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
  const [hubId, setHubId] = useState<string | null>(null);
  const [planId, setPlanId] = useState<string | null>(null);

  const coords = location?.coords ?? null;
  const locality = location?.locality ?? "";
  const locationLabel = locality || location?.pinCode || "Near me";

  const hubs = useMemo(() => {
    const list = catalog.data?.hubs ?? [];
    const withDistance = list.map((hub) => ({
      ...hub,
      distance: coords
        ? distanceKm(coords, { lat: hub.latitude, lng: hub.longitude })
        : null,
    }));
    if (coords) {
      return withDistance.sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
    }
    if (locality) {
      return withDistance.sort((a, b) =>
        a.locality === locality ? -1 : b.locality === locality ? 1 : 0,
      );
    }
    return withDistance;
  }, [catalog.data, coords, locality]);

  const availability = useMemo(() => {
    const inventory = catalog.data?.inventory ?? [];
    return (catalog.data?.models ?? []).map((model) => {
      const rows = inventory.filter((row) => row.model_id === model.id);
      const hubsWithStock = rows
        .filter((row) => row.available > 0)
        .map((row) => row.hub_id);
      const total = rows.reduce((sum, row) => sum + row.available, 0);
      const plans = (catalog.data?.plans ?? []).filter(
        (plan) => plan.model_id === model.id || plan.model_id === null,
      );
      const cheapest = plans.reduce<number | null>(
        (min, plan) => (min === null ? plan.rental_amount : Math.min(min, plan.rental_amount)),
        null,
      );
      return { model, total, hubsWithStock, plans, cheapest };
    });
  }, [catalog.data]);

  const selectedModel = availability.find((row) => row.model.id === modelId) ?? null;
  const modelHubs = hubs.filter((hub) => selectedModel?.hubsWithStock.includes(hub.id));
  const plans = selectedModel?.plans ?? [];

  function continueToReserve() {
    if (!modelId || !hubId || !planId) return;
    sessionStorage.setItem(
      "drivex.selection",
      JSON.stringify({ modelId, hubId, planId }),
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

  return (
    <AppShell>
      <section className="relative overflow-hidden rounded-3xl border border-primary/25">
        <img
          src={bannerImage}
          alt="Orange and black scooter lit by warm rim light"
          width={1536}
          height={768}
          className="h-52 w-full object-cover sm:h-64"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/10" />
        <div className="absolute inset-x-0 bottom-0 p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
            DriveX · {locationLabel}
          </p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight sm:text-3xl">
            {t("bannerHeadline")}
          </h1>
          <p className="mt-1.5 max-w-md text-xs text-muted-foreground sm:text-sm">
            {t("bannerSub")}
          </p>
        </div>
      </section>

      <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-border bg-card/70 px-4 py-3 backdrop-blur">
        <span className="flex items-center gap-2 text-sm">
          <MapPin className="h-4 w-4 text-primary" />
          <span className="font-medium">{locationLabel}</span>
        </span>
        <button
          type="button"
          onClick={clearLocation}
          className="text-xs font-medium text-primary underline-offset-4 hover:underline"
        >
          {t("changeLocation")}
        </button>
      </div>

      <p className="mt-4 text-sm text-muted-foreground">{t("discoveryIntro")}</p>

      <section className="mt-6">
        <h2 className="text-sm font-semibold">{t("bikesNearYou")}</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {availability.map(({ model, total, cheapest }) => {
            const soldOut = total === 0;
            return (
              <button
                key={model.id}
                type="button"
                disabled={soldOut}
                onClick={() => {
                  setModelId(model.id);
                  setHubId(null);
                  setPlanId(null);
                }}
                className={cn(
                  "rounded-2xl border p-4 text-left transition-colors",
                  modelId === model.id
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border bg-card/70 backdrop-blur hover:border-primary/40",
                  soldOut && "opacity-60",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
                    <BikeIcon className="h-5 w-5 text-primary" />
                  </span>
                  <Badge variant={soldOut ? "secondary" : "default"}>
                    {soldOut ? "Not available" : `${total} available`}
                  </Badge>
                </div>
                <p className="mt-3 font-semibold">{modelTitle(model.brand, model.name)}</p>
                <p className="text-xs text-muted-foreground">
                  {model.fuel_type} · {model.transmission}
                  {model.engine ? ` · ${model.engine}` : ""}
                </p>
                <p className="mt-2 text-sm">
                  {cheapest ? `From ${rupees(cheapest)}` : "Plans coming soon"}
                </p>
                {soldOut && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {t("soldOut")}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {selectedModel && (
        <section className="mt-6">
          <h2 className="text-sm font-semibold">{t("pickHub")}</h2>
          {modelHubs.length === 0 ? (
            <p className="mt-3 rounded-2xl border border-border bg-card/70 p-4 text-sm text-muted-foreground backdrop-blur">
              {t("noHubStock")}
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {modelHubs.map((hub) => (
                <button
                  key={hub.id}
                  type="button"
                  onClick={() => setHubId(hub.id)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-colors",
                    hubId === hub.id
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border bg-card/70 backdrop-blur hover:border-primary/40",
                  )}
                >
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>
                    <span className="block font-medium">{hub.name}</span>
                    <span className="block text-xs text-muted-foreground">{hub.address}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      Open {hub.opens_at}–{hub.closes_at}
                      {hub.distance !== null ? ` · ${hub.distance} km away` : ""}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {selectedModel && hubId && (
        <section className="mt-6">
          <h2 className="text-sm font-semibold">{t("choosePlan")}</h2>
          <div className="mt-3 space-y-3">
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                selected={planId === plan.id}
                onSelect={() => setPlanId(plan.id)}
              />
            ))}
          </div>
        </section>
      )}

      {planId && (
        <div className="sticky bottom-4 mt-6">
          <Button className="w-full" size="lg" onClick={continueToReserve}>
            {t("continueReserve")}
          </Button>
        </div>
      )}
    </AppShell>
  );
}
