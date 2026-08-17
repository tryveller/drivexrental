ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS pickup_on date,
  ADD COLUMN IF NOT EXISTS pickup_slot text,
  ADD COLUMN IF NOT EXISTS dropoff_on date,
  ADD COLUMN IF NOT EXISTS dropoff_slot text,
  ADD COLUMN IF NOT EXISTS billed_days integer,
  ADD COLUMN IF NOT EXISTS billed_extra_hours integer,
  ADD COLUMN IF NOT EXISTS quoted_total integer,
  ADD COLUMN IF NOT EXISTS pickup_changed_at timestamptz,
  ADD COLUMN IF NOT EXISTS pickup_change_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS original_pickup_on date;

ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS late_return_fee integer NOT NULL DEFAULT 50;