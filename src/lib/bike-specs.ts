// Rider-facing model specs. The numbers live on `vehicle_models` in the
// database; this module only normalises them and computes comparative badges.
// The FALLBACK below is a last-resort guard for a model row with blank specs.

export type SpecSource = {
  name: string;
  mileage_kmpl?: number | null;
  range_km?: number | null;
  top_speed_kmph?: number | null;
  storage_litres?: number | null;
  kerb_weight_kg?: number | null;
  safety_key?: string | null;
  best_for_key?: string | null;
  start_type?: string | null;
};


export type BikeSpec = {
  /** Fuel economy in kmpl, or null for electric models. */
  mileageKmpl: number | null;
  /** Real-world range for electric models. */
  rangeKm: number | null;
  topSpeedKmph: number;
  /** Usable under-seat / front storage in litres. 0 = bag hook only. */
  storageLitres: number;
  kerbWeightKg: number;
  /** Braking + grip summary, as a copy key. */
  safetyKey: string;
  /** Who this model suits best, as a copy key. */
  bestForKey: string;
  /** Engine start type: kick, electric or both. */
  startKey: string;
};


const FALLBACK: BikeSpec = {
  mileageKmpl: 60,
  rangeKm: null,
  topSpeedKmph: 80,
  storageLitres: 0,
  kerbWeightKg: 110,
  safetyKey: "safetySbtTubeless",
  bestForKey: "bestForCommute",
  startKey: "startTypeBoth",
};


export function bikeSpec(model: SpecSource): BikeSpec {
  const hasRange = model.range_km !== null && model.range_km !== undefined;
  return {
    mileageKmpl: hasRange ? null : (model.mileage_kmpl ?? FALLBACK.mileageKmpl),
    rangeKm: model.range_km ?? null,
    topSpeedKmph: model.top_speed_kmph ?? FALLBACK.topSpeedKmph,
    storageLitres: model.storage_litres ?? FALLBACK.storageLitres,
    kerbWeightKg: model.kerb_weight_kg ?? FALLBACK.kerbWeightKg,
    safetyKey: model.safety_key ?? FALLBACK.safetyKey,
    bestForKey: model.best_for_key ?? FALLBACK.bestForKey,
    startKey: (() => {
      switch (model.start_type?.toUpperCase()) {
        case "KICK":
          return "startTypeKick";
        case "ELECTRIC":
          return "startTypeElectric";
        case "BOTH":
          return "startTypeBoth";
        default:
          return FALLBACK.startKey;
      }
    })(),
  };
}


/**
 * "Best in class" badges, computed across only the models actually on offer at
 * the hub — so a badge always means something the rider can compare right now.
 */
export function bestInClass(models: SpecSource[]): Record<string, string[]> {
  const rows = models.map((model) => ({ name: model.name, spec: bikeSpec(model) }));
  const result: Record<string, string[]> = {};
  const add = (name: string, key: string) => {
    result[name] = [...(result[name] ?? []), key];
  };

  const economy = (spec: BikeSpec) => spec.mileageKmpl ?? Number.POSITIVE_INFINITY;
  const best = (pick: (spec: BikeSpec) => number, key: string) => {
    if (rows.length < 2) return;
    const top = Math.max(...rows.map((row) => pick(row.spec)));
    const winners = rows.filter((row) => pick(row.spec) === top);
    if (winners.length === rows.length) return;
    winners.forEach((row) => add(row.name, key));
  };

  best((spec) => economy(spec), "badgeBestMileage");
  best((spec) => spec.topSpeedKmph, "badgeQuickest");
  best((spec) => spec.storageLitres, "badgeMostStorage");
  best((spec) => -spec.kerbWeightKg, "badgeLightest");

  return result;
}
