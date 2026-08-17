ALTER TABLE public.vehicle_models
  ADD COLUMN IF NOT EXISTS mileage_kmpl integer,
  ADD COLUMN IF NOT EXISTS range_km integer,
  ADD COLUMN IF NOT EXISTS top_speed_kmph integer,
  ADD COLUMN IF NOT EXISTS storage_litres integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS kerb_weight_kg integer,
  ADD COLUMN IF NOT EXISTS safety_key text NOT NULL DEFAULT 'safetySbtTubeless',
  ADD COLUMN IF NOT EXISTS best_for_key text NOT NULL DEFAULT 'bestForCommute';

UPDATE public.vehicle_models SET mileage_kmpl = 56, range_km = NULL, top_speed_kmph = 82, storage_litres = 33, kerb_weight_kg = 108, safety_key = 'safetySbtTubeless', best_for_key = 'bestForErrands' WHERE lower(name) LIKE '%jupiter%';
UPDATE public.vehicle_models SET mileage_kmpl = 69, range_km = NULL, top_speed_kmph = 85, storage_litres = 0, kerb_weight_kg = 112, safety_key = 'safetySbtCushioned', best_for_key = 'bestForCommute' WHERE lower(name) LIKE '%radeon%';
UPDATE public.vehicle_models SET mileage_kmpl = 70, range_km = NULL, top_speed_kmph = 90, storage_litres = 0, kerb_weight_kg = 110, safety_key = 'safetySbtLight', best_for_key = 'bestForLongRides' WHERE lower(name) LIKE '%sport%';
UPDATE public.vehicle_models SET mileage_kmpl = NULL, range_km = 158, top_speed_kmph = 65, storage_litres = 34, kerb_weight_kg = 106, safety_key = 'safetySbtTubeless', best_for_key = 'bestForNewRiders' WHERE lower(name) LIKE '%orbiter%';
UPDATE public.vehicle_models SET top_speed_kmph = COALESCE(top_speed_kmph, 80), kerb_weight_kg = COALESCE(kerb_weight_kg, 110), mileage_kmpl = CASE WHEN range_km IS NULL THEN COALESCE(mileage_kmpl, 60) ELSE mileage_kmpl END;