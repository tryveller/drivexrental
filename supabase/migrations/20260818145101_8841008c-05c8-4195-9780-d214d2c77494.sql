ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS reservation_terms_version text,
  ADD COLUMN IF NOT EXISTS reservation_terms_text text,
  ADD COLUMN IF NOT EXISTS reservation_terms_at timestamptz;

CREATE TABLE IF NOT EXISTS public.eligibility_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  result text NOT NULL,
  dl_front_path text,
  dl_back_path text,
  selfie_path text,
  consent_version text,
  consent_text text,
  consent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.eligibility_checks TO authenticated;
GRANT ALL ON public.eligibility_checks TO service_role;

ALTER TABLE public.eligibility_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Riders read their own eligibility checks"
  ON public.eligibility_checks FOR SELECT TO authenticated
  USING (auth.uid() = customer_id OR public.is_staff(auth.uid()));

CREATE INDEX IF NOT EXISTS eligibility_checks_customer_idx
  ON public.eligibility_checks (customer_id, created_at DESC);