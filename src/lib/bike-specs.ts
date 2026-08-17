// Rider-facing model specs. These are model-level facts (not per-vehicle
// telemetry) that riders actually choose on: mileage, top speed, storage,
// braking/handling. Kept in code so copy keys and numbers stay reviewable.

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
};

const SPECS: { match: string; spec: BikeSpec }[] = [
  {
    match: "jupiter",
    spec: {
      mileageKmpl: 56,
      rangeKm: null,
      topSpeedKmph: 82,
      storageLitres: 33,
      kerbWeightKg: 108,
      safetyKey: "safetySbtTubeless",
      bestForKey: "bestForErrands",
    },
  },
  {
    match: "radeon",
    spec: {
      mileageKmpl: 69,
      rangeKm: null,
      topSpeedKmph: 85,
      storageLitres: 0,
      kerbWeightKg: 112,
      safetyKey: "safetySbtCushioned",
      bestForKey: "bestForCommute",
    },
  },
  {
    match: "sport",
    spec: {
      mileageKmpl: 70,
      rangeKm: null,
      topSpeedKmph: 90,
      storageLitres: 0,
      kerbWeightKg: 110,
      safetyKey: "safetySbtLight",
      bestForKey: "bestForLongRides",
    },
  },
  {
    match: "orbiter",
    spec: {
      mileageKmpl: null,
      rangeKm: 158,
      topSpeedKmph: 65,
      storageLitres: 34,
      kerbWeightKg: 106,
      safetyKey: "safetySbtTubeless",
      bestForKey: "bestForNewRiders",
    },
  },
];

const FALLBACK: BikeSpec = {
  mileageKmpl: 60,
  rangeKm: null,
  topSpeedKmph: 80,
  storageLitres: 0,
  kerbWeightKg: 110,
  safetyKey: "safetySbtTubeless",
  bestForKey: "bestForCommute",
};

export function bikeSpec(modelName: string): BikeSpec {
  const key = modelName.toLowerCase();
  return SPECS.find((row) => key.includes(row.match))?.spec ?? FALLBACK;
}

/**
 * "Best in class" badges, computed across only the models actually on offer at
 * the hub — so a badge always means something the rider can compare right now.
 */
export function bestInClass(modelNames: string[]): Record<string, string[]> {
  const rows = modelNames.map((name) => ({ name, spec: bikeSpec(name) }));
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
