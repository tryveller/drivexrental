import { BatteryCharging, Fuel, Gauge, MapPin, Navigation, Package, Power, ShieldCheck, Sparkles, Wrench, Zap } from "lucide-react";
import type { CatalogModel, CatalogVehicle } from "@/lib/catalog.functions";
import { computeConditionScore } from "@/lib/pricing";
import { bikeSpec } from "@/lib/bike-specs";
import { modelTitle, rupees, shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";
import jupiter from "@/assets/bike-jupiter.jpg";
import radeon from "@/assets/bike-radeon.jpg";
import sport from "@/assets/bike-sport.jpg";
import orbiter from "@/assets/bike-orbiter.jpg";

const IMAGES: { match: string; src: string }[] = [
  { match: "jupiter", src: jupiter },
  { match: "radeon", src: radeon },
  { match: "sport", src: sport },
  { match: "orbiter", src: orbiter },
];

export function bikeImage(name: string): string {
  const key = name.toLowerCase();
  return IMAGES.find((image) => key.includes(image.match))?.src ?? jupiter;
}

const THEMES: { match: string; className: string }[] = [
  { match: "radeon", className: "bike-theme-ember" },
  { match: "sport", className: "bike-theme-amber" },
  { match: "jupiter", className: "bike-theme-gold" },
  { match: "orbiter", className: "bike-theme-copper" },
];

/** Each model gets its own orange shade so swiping feels like a change. */
export function bikeTheme(name: string): string {
  const key = name.toLowerCase();
  return THEMES.find((theme) => key.includes(theme.match))?.className ?? "bike-theme-amber";
}

export function BikeCard({
  model,
  vehicle,
  fromAmount,
  fromPeriod,
  unitsReady,
  distance,
  hubLocality,
  badges,
  selected,
  onSelect,
}: {
  model: CatalogModel;
  vehicle: CatalogVehicle;
  fromAmount: number | null;
  fromPeriod: string | null;
  unitsReady?: number;
  distance?: number | null;
  hubLocality?: string | null;
  placeLabel?: string;
  badges?: string[];
  selected: boolean;
  onSelect: () => void;
}) {
  const condition = computeConditionScore(vehicle);
  const spec = bikeSpec(model);
  const { t } = useLanguage();

  const specs = [
    {
      icon: spec.isElectric ? BatteryCharging : Fuel,
      label: t("fuelLabel"),
      value: spec.isElectric ? t("fuelElectric") : t("fuelPetrol"),
    },
    {
      icon: Fuel,
      label: spec.mileageKmpl ? t("specMileage") : t("specRange"),
      value: spec.mileageKmpl
        ? t("unitKmpl", { value: spec.mileageKmpl })
        : t("unitKm", { value: spec.rangeKm ?? 0 }),
    },
    {
      icon: Zap,
      label: t("specTopSpeed"),
      value: t("unitKmph", { value: spec.topSpeedKmph }),
    },
    {
      icon: Package,
      label: t("specStorage"),
      value:
        spec.storageLitres > 0
          ? t("unitLitres", { value: spec.storageLitres })
          : t("storageNone"),
    },
    {
      icon: Power,
      label: t("specStartType"),
      value: t(spec.startKey as never),
    },

  ];

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group flex h-full w-full flex-col overflow-hidden rounded-3xl border bg-card/80 text-left backdrop-blur transition-all",
        "bike-theme",
        bikeTheme(model.name),
        selected ? "border-primary ring-1 ring-primary" : "border-primary/25 hover:border-primary/60",
      )}
      style={{
        backgroundImage:
          "linear-gradient(160deg, var(--bike-wash), transparent 55%, var(--bike-wash))",
      }}
    >
      <div className="relative shrink-0">
        <img
          src={bikeImage(model.name)}
          alt={modelTitle(model.brand, model.name)}
          width={1024}
          height={768}
          loading="lazy"
          className="h-44 w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-primary/90 px-2.5 py-1 text-[11px] font-semibold text-primary-foreground">
          <ShieldCheck className="h-3 w-3" />
          {condition.score}/100
          <span className="font-medium opacity-90">· {t(condition.labelKey)}</span>
        </span>
        {distance !== null && distance !== undefined && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-background/80 px-2.5 py-1 text-[11px] font-semibold backdrop-blur">
            <Navigation className="h-3 w-3 text-primary" />
            {distance} km
          </span>
        )}
        <div className="absolute inset-x-3 bottom-2 flex items-end justify-between gap-2">
          <span className="text-sm font-semibold">{modelTitle(model.brand, model.name)}</span>
          {fromAmount !== null && (
            <span className="text-right text-sm font-semibold text-primary">
              {rupees(fromAmount)}
              <span className="text-[11px] font-medium text-muted-foreground">
                /{fromPeriod ?? "day"}
              </span>
            </span>
          )}
        </div>
      </div>

      {hubLocality ? (
        <div className="flex items-center gap-1.5 px-3 pt-2 text-[11px] text-muted-foreground">
          <MapPin className="h-3 w-3 text-primary" />
          <span className="truncate">{t("parkedAt", { hub: hubLocality })}</span>
        </div>
      ) : null}

      <div className="flex items-center gap-3 px-3 pb-3 pt-2 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Wrench className="h-3 w-3 text-primary" />
          {t("serviced", { date: shortDate(vehicle.last_service_date) })}
        </span>
        <span className="inline-flex items-center gap-1">
          <Gauge className="h-3 w-3 text-primary" />
          {vehicle.odometer_km.toLocaleString("en-IN")} km
        </span>
        <span className="ml-auto">
          {vehicle.condition === "NEW" ? t("condNew") : t("condRefurbished")}
        </span>
      </div>

      {(badges?.length ?? 0) > 0 && (
        <div className="flex flex-wrap gap-1.5 px-3 pb-2">
          {badges?.map((badge) => (
            <span
              key={badge}
              className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary"
            >
              <Sparkles className="h-2.5 w-2.5" />
              {t(badge as never)}
            </span>
          ))}
        </div>
      )}

      <dl className="mt-auto grid grid-cols-2 gap-x-3 gap-y-2 border-t border-primary/20 px-3 py-3">
        {specs.map((row) => (
          <div key={row.label} className="min-w-0">
            <dt className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
              <row.icon className="h-3 w-3 text-primary" />
              {row.label}
            </dt>
            <dd className="truncate text-[11px] font-semibold">{row.value}</dd>
          </div>
        ))}
      </dl>

      <div className="flex shrink-0 items-center justify-between gap-2 border-t border-primary/20 px-3 py-2 text-[10px] text-muted-foreground">
        <span className="truncate font-medium text-foreground/80">{t(spec.bestForKey as never)}</span>
        {unitsReady ? <span className="shrink-0">{t("unitsReady", { count: unitsReady })}</span> : null}
      </div>
    </button>
  );
}