CREATE TABLE public.addon_pricing (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  label_key text NOT NULL,
  amount integer NOT NULL,
  unit text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.addon_pricing TO anon;
GRANT SELECT ON public.addon_pricing TO authenticated;
GRANT ALL ON public.addon_pricing TO service_role;

ALTER TABLE public.addon_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Addon pricing is publicly readable"
  ON public.addon_pricing FOR SELECT
  USING (true);

INSERT INTO public.addon_pricing (code, label_key, amount, unit) VALUES
  ('helmet_daily_rate', 'helmetPerDay', 10, 'PER_DAY'),
  ('helmet_monthly_rate', 'helmetPerMonth', 100, 'PER_MONTH'),
  ('helmet_buy_price', 'helmetBuy', 1000, 'ONE_TIME'),
  ('helmets_included', 'helmetIncluded', 1, 'COUNT');

ALTER TABLE public.bookings
  ADD COLUMN extra_helmet_mode text NOT NULL DEFAULT 'NONE',
  ADD COLUMN extra_helmet_amount integer NOT NULL DEFAULT 0;