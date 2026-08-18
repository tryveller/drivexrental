CREATE TABLE public.rider_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  display_name text,
  kyc_status public.kyc_status NOT NULL DEFAULT 'NOT_STARTED',
  kyc_approved_at timestamptz,
  kyc_expires_on date,
  dl_number text,
  dl_name text,
  dl_dob date,
  dl_valid_until date,
  credit_score integer NOT NULL DEFAULT 650,
  wallet_balance integer NOT NULL DEFAULT 0,
  deposit_in_wallet integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.rider_profiles TO authenticated;
GRANT ALL ON public.rider_profiles TO service_role;
ALTER TABLE public.rider_profiles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER rider_profiles_updated_at BEFORE UPDATE ON public.rider_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.customers ADD COLUMN profile_id uuid REFERENCES public.rider_profiles(id) ON DELETE SET NULL;
ALTER TABLE public.customer_documents ADD COLUMN profile_id uuid REFERENCES public.rider_profiles(id) ON DELETE SET NULL;

-- Backfill: one profile per existing rider, carrying over an approved KYC.
INSERT INTO public.rider_profiles (id, display_name)
SELECT gen_random_uuid(), c.full_name FROM public.customers c WHERE c.profile_id IS NULL;

WITH pairs AS (
  SELECT c.id AS customer_id,
         p.id AS profile_id,
         row_number() OVER (ORDER BY c.created_at) AS rn_c
  FROM public.customers c
  JOIN (SELECT id, row_number() OVER (ORDER BY created_at) AS rn_p FROM public.rider_profiles) p
    ON true
  WHERE false
)
SELECT 1;

DO $$
DECLARE r record; new_id uuid;
BEGIN
  FOR r IN SELECT id, full_name FROM public.customers WHERE profile_id IS NULL LOOP
    INSERT INTO public.rider_profiles (display_name) VALUES (r.full_name) RETURNING id INTO new_id;
    UPDATE public.customers SET profile_id = new_id WHERE id = r.id;
    UPDATE public.customer_documents SET profile_id = new_id WHERE customer_id = r.id;
  END LOOP;
END $$;

-- Remove the placeholder profiles created by the bulk insert above.
DELETE FROM public.rider_profiles rp
WHERE NOT EXISTS (SELECT 1 FROM public.customers c WHERE c.profile_id = rp.id);

UPDATE public.rider_profiles rp
SET kyc_status = 'APPROVED',
    kyc_approved_at = k.updated_at,
    dl_number = k.dl_number,
    dl_name = k.dl_name,
    dl_dob = k.dl_dob,
    dl_valid_until = k.dl_valid_until
FROM public.customers c
JOIN public.kyc_cases k ON k.customer_id = c.id AND k.status = 'APPROVED'
WHERE c.profile_id = rp.id;

CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT profile_id FROM public.customers WHERE id = auth.uid();
$$;

CREATE POLICY "Riders read their own profile" ON public.rider_profiles
  FOR SELECT TO authenticated
  USING (id = public.current_profile_id() OR public.is_staff(auth.uid()));

CREATE POLICY "Riders read phones on their profile" ON public.customers
  FOR SELECT TO authenticated
  USING (profile_id IS NOT NULL AND profile_id = public.current_profile_id());

CREATE TABLE public.rider_phone_invites (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid NOT NULL REFERENCES public.rider_profiles(id) ON DELETE CASCADE,
  phone text NOT NULL,
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  label text,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, phone)
);

GRANT SELECT ON public.rider_phone_invites TO authenticated;
GRANT ALL ON public.rider_phone_invites TO service_role;
ALTER TABLE public.rider_phone_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Riders read invites on their profile" ON public.rider_phone_invites
  FOR SELECT TO authenticated
  USING (profile_id = public.current_profile_id() OR public.is_staff(auth.uid()));

CREATE TABLE public.wallet_ledger (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid NOT NULL REFERENCES public.rider_profiles(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  entry_type text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('CREDIT','DEBIT')),
  amount integer NOT NULL CHECK (amount >= 0),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.wallet_ledger TO authenticated;
GRANT ALL ON public.wallet_ledger TO service_role;
ALTER TABLE public.wallet_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Riders read their own wallet history" ON public.wallet_ledger
  FOR SELECT TO authenticated
  USING (profile_id = public.current_profile_id() OR public.is_staff(auth.uid()));

CREATE INDEX idx_wallet_ledger_profile ON public.wallet_ledger(profile_id, created_at DESC);
CREATE INDEX idx_customers_profile ON public.customers(profile_id);