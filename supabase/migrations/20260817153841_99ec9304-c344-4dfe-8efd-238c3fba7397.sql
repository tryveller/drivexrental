-- Day 1 launch fleet: single hub, 100 ICE two-wheelers.
DELETE FROM public.vehicles v
WHERE NOT EXISTS (SELECT 1 FROM public.bookings b WHERE b.vehicle_id = v.id)
  AND NOT EXISTS (SELECT 1 FROM public.rentals r WHERE r.vehicle_id = v.id)
  AND NOT EXISTS (SELECT 1 FROM public.inspections i WHERE i.vehicle_id = v.id)
  AND NOT EXISTS (SELECT 1 FROM public.challans c WHERE c.vehicle_id = v.id);

UPDATE public.hubs SET is_active = false
WHERE id <> '11111111-1111-1111-1111-111111111101';
UPDATE public.hubs SET is_active = true
WHERE id = '11111111-1111-1111-1111-111111111101';

WITH fleet AS (
  SELECT * FROM (
    VALUES
      ('22222222-2222-2222-2222-222222222202'::uuid, 'RD', 45, 34),  -- TVS Radeon
      ('22222222-2222-2222-2222-222222222203'::uuid, 'SP', 45, 34),  -- TVS Sport
      ('22222222-2222-2222-2222-222222222201'::uuid, 'JP', 10, 7)    -- TVS Jupiter
  ) AS t(model_id, code, total, new_count)
),
units AS (
  SELECT
    f.model_id,
    f.code,
    n,
    (n <= f.new_count) AS is_new
  FROM fleet f, generate_series(1, 45) AS n
  WHERE n <= f.total
)
INSERT INTO public.vehicles (
  model_id, hub_id, condition, registration_number, status,
  odometer_km, fuel_percent, last_service_date, last_service_odometer,
  telemetry_updated_at
)
SELECT
  u.model_id,
  '11111111-1111-1111-1111-111111111101',
  'NEW',                                  -- Day 1 fleet has no refurbished units
  'KA51 ' || u.code || ' ' || lpad((1000 + u.n)::text, 4, '0'),
  'AVAILABLE',
  CASE WHEN u.is_new THEN 8 + (u.n * 7) % 120
       ELSE 3800 + (u.n * 431) % 5200 END,
  70 + (u.n * 13) % 30,
  CASE WHEN u.is_new THEN current_date - ((u.n % 4))
       ELSE current_date - ((u.n * 3) % 11) END,
  CASE WHEN u.is_new THEN 0
       ELSE GREATEST(0, (3800 + (u.n * 431) % 5200) - ((u.n * 97) % 900)) END,
  now()
FROM units u;