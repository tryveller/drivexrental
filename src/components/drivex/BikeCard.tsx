import { Gauge, ShieldCheck, Wrench } from "lucide-react";
import type { CatalogModel, CatalogVehicle } from "@/lib/catalog.functions";
import { computeConditionScore } from "@/lib/pricing";
import { modelTitle, rupees, shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
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

export function BikeCard({
  model,
  vehicle,
  fromAmount,
  fromPeriod,
  selected,
  onSelect,
}: {
  model: CatalogModel;
  vehicle: CatalogVehicle;
  fromAmount: number | null;
  fromPeriod: string | null;
  selected: boolean;
  onSelect: () => void;
}) {
  const condition = computeConditionScore(vehicle);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group overflow-hidden rounded-3xl border text-left transition-all",
        selected
          ? "border-primary bg-primary/10 ring-1 ring-primary"
          : "border-border bg-card/70 backdrop-blur hover:border-primary/50",
      )}
    >
      <div className="relative">
        <img
          src={bikeImage(model.name)}
          alt={modelTitle(model.brand, model.name)}
          width={1024}
          height={768}
          loading="lazy"
          className="h-40 w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-primary/90 px-2.5 py-1 text-[11px] font-semibold text-primary-foreground">
          <ShieldCheck className="h-3 w-3" />
          {condition.score}
          <span className="font-medium opacity-90">· {condition.label}</span>
        </span>
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

      <div className="flex items-center gap-3 px-3 pb-3 pt-2 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Wrench className="h-3 w-3 text-primary" />
          Serviced {shortDate(vehicle.last_service_date)}
        </span>
        <span className="inline-flex items-center gap-1">
          <Gauge className="h-3 w-3 text-primary" />
          {vehicle.odometer_km.toLocaleString("en-IN")} km
        </span>
        <span className="ml-auto">
          {vehicle.condition === "NEW" ? "New" : "Refurbished"}
        </span>
      </div>
    </button>
  );
}