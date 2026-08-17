import { createServerFn } from "@tanstack/react-start";

export type CatalogHub = {
  id: string;
  name: string;
  locality: string;
  address: string;
  latitude: number;
  longitude: number;
  opens_at: string;
  closes_at: string;
  phone: string | null;
};

export type CatalogPlan = {
  id: string;
  model_id: string | null;
  plan_type: "DAILY" | "WEEKLY" | "MONTHLY" | "RTO";
  vehicle_condition: "NEW" | "REFURBISHED";
  billing_period: string;
  rental_amount: number;
  deposit_amount: number;
  downpayment_amount: number;
  processing_fee: number;
  included_km: number;
  extra_km_rate: number;
  reservation_amount: number;
  late_fee_per_day: number;
  rto_total_months: number | null;
};

export type CatalogModel = {
  id: string;
  brand: string;
  name: string;
  fuel_type: string;
  engine: string | null;
  transmission: string;
  features: string[];
};

export type CatalogInventory = {
  hub_id: string;
  model_id: string;
  condition: "NEW" | "REFURBISHED";
  available: number;
};

export type CatalogVehicle = {
  id: string;
  hub_id: string;
  model_id: string;
  condition: "NEW" | "REFURBISHED";
  odometer_km: number;
  last_service_date: string | null;
  last_service_odometer: number;
};

export const getCatalog = createServerFn({ method: "GET" }).handler(async () => {
  const { publicClient } = await import("./drivex.server");
  const supabase = publicClient();

  const [hubs, models, plans, vehicles] = await Promise.all([
    supabase
      .from("hubs")
      .select("id, name, locality, address, latitude, longitude, opens_at, closes_at, phone"),
    supabase
      .from("vehicle_models")
      .select("id, brand, name, fuel_type, engine, transmission, features"),
    supabase
      .from("plans")
      .select(
        "id, model_id, plan_type, vehicle_condition, billing_period, rental_amount, deposit_amount, downpayment_amount, processing_fee, included_km, extra_km_rate, reservation_amount, late_fee_per_day, rto_total_months",
      ),
    supabase
      .from("vehicles")
      .select(
        "id, hub_id, model_id, condition, status, odometer_km, last_service_date, last_service_odometer",
      ),
  ]);

  const inventory: CatalogInventory[] = [];
  for (const vehicle of vehicles.data ?? []) {
    if (vehicle.status !== "AVAILABLE" && vehicle.status !== "READY_FOR_RENT") continue;
    const existing = inventory.find(
      (row) => row.hub_id === vehicle.hub_id && row.model_id === vehicle.model_id,
    );
    if (existing) existing.available += 1;
    else
      inventory.push({
        hub_id: vehicle.hub_id,
        model_id: vehicle.model_id,
        condition: vehicle.condition,
        available: 1,
      });
  }

  return {
    hubs: (hubs.data ?? []) as CatalogHub[],
    models: (models.data ?? []) as CatalogModel[],
    vehicles: (vehicles.data ?? [])
      .filter((v) => v.status === "AVAILABLE" || v.status === "READY_FOR_RENT")
      .map((v) => ({
        id: v.id,
        hub_id: v.hub_id,
        model_id: v.model_id,
        condition: v.condition,
        odometer_km: v.odometer_km,
        last_service_date: v.last_service_date,
        last_service_odometer: v.last_service_odometer,
      })) as CatalogVehicle[],
    plans: ((plans.data ?? []) as unknown[]).map((plan) => ({
      ...(plan as CatalogPlan),
      extra_km_rate: Number((plan as CatalogPlan).extra_km_rate),
    })) as CatalogPlan[],
    inventory,
  };
});