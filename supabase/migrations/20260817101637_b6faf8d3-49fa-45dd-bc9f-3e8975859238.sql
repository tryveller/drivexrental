-- ENUMS
CREATE TYPE public.app_role AS ENUM ('admin','hub_staff','rider');
CREATE TYPE public.plan_type AS ENUM ('WEEKLY','MONTHLY','RTO');
CREATE TYPE public.vehicle_condition AS ENUM ('NEW','REFURBISHED');
CREATE TYPE public.vehicle_status AS ENUM ('AVAILABLE','RESERVED','ASSIGNED','ACTIVE','SERVICE_DUE','IN_SERVICE','REPAIR','BLOCKED','RETURN_INSPECTION','READY_FOR_RENT');
CREATE TYPE public.booking_status AS ENUM ('DISCOVERY','BIKE_SELECTED','OTP_VERIFIED','ELIGIBILITY_STARTED','ELIGIBILITY_COMPLETED','ELIGIBILITY_SKIPPED','PAYMENT_PENDING','RESERVED','TRAVEL_TO_HUB','AT_HUB','KYC_IN_PROGRESS','APPROVED','REJECTED','FINAL_PAYMENT_PENDING','PAID','AGREEMENT_ACCEPTED','VEHICLE_ASSIGNED','HANDOVER_PENDING','ACTIVE','RETURN_REQUESTED','RETURN_INSPECTION','SETTLEMENT_PENDING','CLOSED');
CREATE TYPE public.payment_status AS ENUM ('CREATED','INITIATED','PENDING','SUCCESS','FAILED','CANCELLED','REFUND_PENDING','REFUNDED');
CREATE TYPE public.ledger_entry_type AS ENUM ('RESERVATION','RENT','SECURITY_DEPOSIT','RTO_DOWNPAYMENT','PROCESSING_FEE','LATE_FEE','KM_OVERAGE','CHALLAN','DAMAGE','REFUND');
CREATE TYPE public.kyc_status AS ENUM ('NOT_STARTED','SUBMITTED','IN_REVIEW','ACTION_REQUIRED','APPROVED','REJECTED');
CREATE TYPE public.service_status AS ENUM ('DUE','BOOKED','CHECKED_IN','IN_PROGRESS','READY','COMPLETED','MISSED');

-- ROLES
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','hub_staff'));
$$;

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- CATALOG
CREATE TABLE public.hubs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  locality text NOT NULL,
  address text NOT NULL,
  city text NOT NULL DEFAULT 'Bangalore',
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  opens_at text NOT NULL DEFAULT '10:00 AM',
  closes_at text NOT NULL DEFAULT '7:00 PM',
  phone text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.hubs TO anon, authenticated;
GRANT ALL ON public.hubs TO service_role;
ALTER TABLE public.hubs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hubs public read" ON public.hubs FOR SELECT TO anon, authenticated USING (is_active);

CREATE TABLE public.vehicle_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand text NOT NULL DEFAULT 'TVS',
  name text NOT NULL,
  fuel_type text NOT NULL DEFAULT 'Petrol',
  engine text,
  transmission text NOT NULL DEFAULT 'Automatic',
  features text[] NOT NULL DEFAULT '{}',
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.vehicle_models TO anon, authenticated;
GRANT ALL ON public.vehicle_models TO service_role;
ALTER TABLE public.vehicle_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "models public read" ON public.vehicle_models FOR SELECT TO anon, authenticated USING (is_active);

CREATE TABLE public.vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid NOT NULL REFERENCES public.vehicle_models(id) ON DELETE CASCADE,
  hub_id uuid NOT NULL REFERENCES public.hubs(id) ON DELETE CASCADE,
  condition public.vehicle_condition NOT NULL DEFAULT 'REFURBISHED',
  registration_number text NOT NULL UNIQUE,
  status public.vehicle_status NOT NULL DEFAULT 'AVAILABLE',
  odometer_km integer NOT NULL DEFAULT 0,
  telemetry_updated_at timestamptz,
  fuel_percent integer NOT NULL DEFAULT 60,
  last_service_date date,
  last_service_odometer integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER vehicles_updated_at BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
GRANT SELECT ON public.vehicles TO anon, authenticated;
GRANT ALL ON public.vehicles TO service_role;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vehicles public read" ON public.vehicles FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "staff manage vehicles" ON public.vehicles FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));

CREATE TABLE public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid REFERENCES public.vehicle_models(id) ON DELETE CASCADE,
  plan_type public.plan_type NOT NULL,
  vehicle_condition public.vehicle_condition NOT NULL DEFAULT 'REFURBISHED',
  billing_period text NOT NULL,
  rental_amount integer NOT NULL DEFAULT 0,
  deposit_amount integer NOT NULL DEFAULT 0,
  downpayment_amount integer NOT NULL DEFAULT 0,
  processing_fee integer NOT NULL DEFAULT 0,
  included_km integer NOT NULL DEFAULT 0,
  extra_km_rate numeric(6,2) NOT NULL DEFAULT 0,
  reservation_amount integer NOT NULL DEFAULT 199,
  late_fee_per_day integer NOT NULL DEFAULT 100,
  minimum_duration_days integer NOT NULL DEFAULT 7,
  maximum_duration_days integer,
  rto_total_months integer,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.plans TO anon, authenticated;
GRANT ALL ON public.plans TO service_role;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plans public read" ON public.plans FOR SELECT TO anon, authenticated USING (is_active);

-- CUSTOMERS
CREATE TABLE public.customers (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone text NOT NULL,
  full_name text,
  city text DEFAULT 'Bangalore',
  locality text,
  pin_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
GRANT SELECT, INSERT, UPDATE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own customer read" ON public.customers FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "own customer insert" ON public.customers FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "own customer update" ON public.customers FOR UPDATE TO authenticated USING (id = auth.uid());

-- OTP
CREATE TABLE public.otp_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.otp_requests TO service_role;
ALTER TABLE public.otp_requests ENABLE ROW LEVEL SECURITY;

-- BOOKINGS
CREATE SEQUENCE public.booking_code_seq START 10294;
CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_code text NOT NULL UNIQUE DEFAULT ('DXR' || nextval('public.booking_code_seq')::text),
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hub_id uuid NOT NULL REFERENCES public.hubs(id),
  model_id uuid NOT NULL REFERENCES public.vehicle_models(id),
  plan_id uuid NOT NULL REFERENCES public.plans(id),
  vehicle_id uuid REFERENCES public.vehicles(id),
  status public.booking_status NOT NULL DEFAULT 'BIKE_SELECTED',
  reservation_expires_at timestamptz,
  travel_mode text,
  rapido_coupon text,
  checked_in_at timestamptz,
  agreement_accepted_at timestamptz,
  handover_confirmed_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER bookings_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
GRANT SELECT, INSERT, UPDATE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own bookings read" ON public.bookings FOR SELECT TO authenticated USING (customer_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "own bookings insert" ON public.bookings FOR INSERT TO authenticated WITH CHECK (customer_id = auth.uid());
CREATE POLICY "staff bookings update" ON public.bookings FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));

-- PAYMENTS
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES public.bookings(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  purpose text NOT NULL,
  status public.payment_status NOT NULL DEFAULT 'CREATED',
  method text NOT NULL DEFAULT 'UPI',
  reference text,
  receipt_no text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own payments read" ON public.payments FOR SELECT TO authenticated USING (customer_id = auth.uid() OR public.is_staff(auth.uid()));

CREATE TABLE public.payment_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES public.bookings(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  entry_type public.ledger_entry_type NOT NULL,
  amount integer NOT NULL,
  direction text NOT NULL DEFAULT 'DEBIT',
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payment_ledger TO authenticated;
GRANT ALL ON public.payment_ledger TO service_role;
ALTER TABLE public.payment_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ledger read" ON public.payment_ledger FOR SELECT TO authenticated USING (customer_id = auth.uid() OR public.is_staff(auth.uid()));

-- KYC
CREATE TABLE public.kyc_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.kyc_status NOT NULL DEFAULT 'NOT_STARTED',
  dl_number text,
  dl_name text,
  dl_dob date,
  dl_valid_until date,
  dl_state text,
  dl_class text,
  dl_verified boolean NOT NULL DEFAULT false,
  selfie_captured boolean NOT NULL DEFAULT false,
  address_proof_status text NOT NULL DEFAULT 'NOT_STARTED',
  eligibility_result text,
  action_required_reason text,
  rejection_reason text,
  consent_version text,
  consent_text text,
  consent_at timestamptz,
  consent_device text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER kyc_updated_at BEFORE UPDATE ON public.kyc_cases FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
GRANT SELECT ON public.kyc_cases TO authenticated;
GRANT ALL ON public.kyc_cases TO service_role;
ALTER TABLE public.kyc_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own kyc read" ON public.kyc_cases FOR SELECT TO authenticated USING (customer_id = auth.uid() OR public.is_staff(auth.uid()));

-- RENTALS
CREATE TABLE public.rentals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id),
  plan_id uuid NOT NULL REFERENCES public.plans(id),
  status text NOT NULL DEFAULT 'ACTIVE',
  started_at timestamptz NOT NULL DEFAULT now(),
  period_start_odometer integer NOT NULL DEFAULT 0,
  period_started_on date NOT NULL DEFAULT current_date,
  period_resets_on date,
  next_payment_amount integer NOT NULL DEFAULT 0,
  next_payment_due_on date,
  payments_completed integer NOT NULL DEFAULT 0,
  ended_at timestamptz,
  return_slot timestamptz,
  return_hub_id uuid REFERENCES public.hubs(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER rentals_updated_at BEFORE UPDATE ON public.rentals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
GRANT SELECT ON public.rentals TO authenticated;
GRANT ALL ON public.rentals TO service_role;
ALTER TABLE public.rentals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own rentals read" ON public.rentals FOR SELECT TO authenticated USING (customer_id = auth.uid() OR public.is_staff(auth.uid()));

-- SERVICE
CREATE TABLE public.service_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_id uuid NOT NULL REFERENCES public.rentals(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hub_id uuid NOT NULL REFERENCES public.hubs(id),
  scheduled_on date NOT NULL,
  slot text NOT NULL,
  status public.service_status NOT NULL DEFAULT 'BOOKED',
  odometer integer,
  work_done text,
  next_service_on date,
  next_service_odometer integer,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.service_bookings TO authenticated;
GRANT ALL ON public.service_bookings TO service_role;
ALTER TABLE public.service_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own services read" ON public.service_bookings FOR SELECT TO authenticated USING (customer_id = auth.uid() OR public.is_staff(auth.uid()));

-- INSPECTIONS
CREATE TABLE public.inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES public.bookings(id) ON DELETE CASCADE,
  rental_id uuid REFERENCES public.rentals(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id),
  inspection_type text NOT NULL DEFAULT 'HANDOVER',
  odometer integer NOT NULL DEFAULT 0,
  fuel_percent integer NOT NULL DEFAULT 60,
  accessories text[] NOT NULL DEFAULT '{}',
  photos jsonb NOT NULL DEFAULT '[]',
  damages jsonb NOT NULL DEFAULT '[]',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.inspections TO authenticated;
GRANT ALL ON public.inspections TO service_role;
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own inspections read" ON public.inspections FOR SELECT TO authenticated USING (customer_id = auth.uid() OR public.is_staff(auth.uid()));

-- CHALLANS
CREATE TABLE public.challans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_id uuid REFERENCES public.rentals(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id),
  challan_no text NOT NULL,
  violation text NOT NULL,
  amount integer NOT NULL,
  challan_date date NOT NULL DEFAULT current_date,
  location text,
  status text NOT NULL DEFAULT 'PENDING',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.challans TO authenticated;
GRANT ALL ON public.challans TO service_role;
ALTER TABLE public.challans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own challans read" ON public.challans FOR SELECT TO authenticated USING (customer_id = auth.uid() OR public.is_staff(auth.uid()));

-- SETTLEMENTS
CREATE TABLE public.settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_id uuid NOT NULL REFERENCES public.rentals(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deposit_amount integer NOT NULL DEFAULT 0,
  outstanding_rent integer NOT NULL DEFAULT 0,
  challan_amount integer NOT NULL DEFAULT 0,
  km_overage_amount integer NOT NULL DEFAULT 0,
  damage_amount integer NOT NULL DEFAULT 0,
  refund_amount integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'PENDING',
  damages jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.settlements TO authenticated;
GRANT ALL ON public.settlements TO service_role;
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own settlements read" ON public.settlements FOR SELECT TO authenticated USING (customer_id = auth.uid() OR public.is_staff(auth.uid()));

-- ANALYTICS
CREATE TABLE public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid,
  booking_id uuid,
  event text NOT NULL,
  props jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.analytics_events TO service_role;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read analytics" ON public.analytics_events FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

-- SEED HUBS
INSERT INTO public.hubs (id, name, locality, address, latitude, longitude, phone) VALUES
 ('11111111-1111-1111-1111-111111111101','HSR DriveX Hub','HSR Layout','#42, 27th Main Rd, Sector 2, HSR Layout, Bengaluru 560102',12.9121,77.6446,'+918000000101'),
 ('11111111-1111-1111-1111-111111111102','Koramangala DriveX Hub','Koramangala','80 Feet Rd, 4th Block, Koramangala, Bengaluru 560034',12.9352,77.6245,'+918000000102'),
 ('11111111-1111-1111-1111-111111111103','Indiranagar DriveX Hub','Indiranagar','CMH Road, Indiranagar, Bengaluru 560038',12.9784,77.6408,'+918000000103'),
 ('11111111-1111-1111-1111-111111111104','Whitefield DriveX Hub','Whitefield','Whitefield Main Rd, Bengaluru 560066',12.9698,77.7500,'+918000000104');

-- SEED MODELS
INSERT INTO public.vehicle_models (id, name, fuel_type, engine, transmission, features) VALUES
 ('22222222-2222-2222-2222-222222222201','TVS Jupiter','Petrol','109.7 cc','Automatic','{"External fuel fill","Large 33L storage","USB charger","Long comfortable seat"}'),
 ('22222222-2222-2222-2222-222222222202','TVS Radeon','Petrol','109.7 cc','Manual (4 gear)','{"Best in class mileage","LED headlamp","Comfortable long seat","Tubeless tyres"}'),
 ('22222222-2222-2222-2222-222222222203','TVS Sport','Petrol','109.7 cc','Manual (4 gear)','{"70 kmpl mileage","Synchronised braking","Lightweight","Low maintenance"}'),
 ('22222222-2222-2222-2222-222222222204','TVS Orbiter','Electric','Hub motor','Automatic','{"Zero petrol cost","Reverse mode","Digital cluster","Low running cost"}');

-- SEED PLANS
INSERT INTO public.plans (model_id, plan_type, vehicle_condition, billing_period, rental_amount, deposit_amount, downpayment_amount, processing_fee, included_km, extra_km_rate, minimum_duration_days, rto_total_months) VALUES
 ('22222222-2222-2222-2222-222222222201','WEEKLY','REFURBISHED','week',1800,2000,0,0,720,3.50,7,NULL),
 ('22222222-2222-2222-2222-222222222201','MONTHLY','REFURBISHED','month',6500,2000,0,0,3420,3.00,30,NULL),
 ('22222222-2222-2222-2222-222222222201','RTO','NEW','month',3000,0,5000,1500,3600,3.00,30,24),
 ('22222222-2222-2222-2222-222222222202','WEEKLY','REFURBISHED','week',1650,2000,0,0,720,3.50,7,NULL),
 ('22222222-2222-2222-2222-222222222202','MONTHLY','REFURBISHED','month',5900,2000,0,0,3420,3.00,30,NULL),
 ('22222222-2222-2222-2222-222222222202','RTO','NEW','month',2800,0,4500,1500,3600,3.00,30,24),
 ('22222222-2222-2222-2222-222222222203','WEEKLY','REFURBISHED','week',1550,1800,0,0,720,3.50,7,NULL),
 ('22222222-2222-2222-2222-222222222203','MONTHLY','REFURBISHED','month',5600,1800,0,0,3420,3.00,30,NULL),
 ('22222222-2222-2222-2222-222222222204','WEEKLY','NEW','week',1950,2500,0,0,700,4.00,7,NULL),
 ('22222222-2222-2222-2222-222222222204','MONTHLY','NEW','month',6900,2500,0,0,3300,3.50,30,NULL),
 ('22222222-2222-2222-2222-222222222204','RTO','NEW','month',3400,0,6000,1800,3300,3.50,30,24);

-- SEED VEHICLES
INSERT INTO public.vehicles (model_id, hub_id, condition, registration_number, odometer_km, telemetry_updated_at, last_service_date, last_service_odometer) VALUES
 ('22222222-2222-2222-2222-222222222201','11111111-1111-1111-1111-111111111101','REFURBISHED','KA05HJ1234',18420,now(),current_date - 10,17800),
 ('22222222-2222-2222-2222-222222222201','11111111-1111-1111-1111-111111111101','REFURBISHED','KA05HJ1235',22110,now(),current_date - 4,21900),
 ('22222222-2222-2222-2222-222222222201','11111111-1111-1111-1111-111111111102','REFURBISHED','KA05HJ1236',15980,now(),current_date - 6,15600),
 ('22222222-2222-2222-2222-222222222202','11111111-1111-1111-1111-111111111101','REFURBISHED','KA03MK4411',26310,now(),current_date - 12,25800),
 ('22222222-2222-2222-2222-222222222202','11111111-1111-1111-1111-111111111102','REFURBISHED','KA03MK4412',19750,now(),current_date - 3,19500),
 ('22222222-2222-2222-2222-222222222202','11111111-1111-1111-1111-111111111102','REFURBISHED','KA03MK4413',21400,now(),current_date - 8,21000),
 ('22222222-2222-2222-2222-222222222202','11111111-1111-1111-1111-111111111103','REFURBISHED','KA03MK4414',17650,now(),current_date - 2,17400),
 ('22222222-2222-2222-2222-222222222203','11111111-1111-1111-1111-111111111101','REFURBISHED','KA51NB7781',31200,now(),current_date - 9,30600),
 ('22222222-2222-2222-2222-222222222203','11111111-1111-1111-1111-111111111103','REFURBISHED','KA51NB7782',28450,now(),current_date - 5,28100),
 ('22222222-2222-2222-2222-222222222203','11111111-1111-1111-1111-111111111104','REFURBISHED','KA51NB7783',24900,now(),current_date - 7,24500),
 ('22222222-2222-2222-2222-222222222204','11111111-1111-1111-1111-111111111101','NEW','KA01EV9001',1200,now(),current_date - 1,1000),
 ('22222222-2222-2222-2222-222222222204','11111111-1111-1111-1111-111111111102','NEW','KA01EV9002',860,now(),current_date - 1,700),
 ('22222222-2222-2222-2222-222222222204','11111111-1111-1111-1111-111111111103','NEW','KA01EV9003',430,now(),current_date - 1,300),
 ('22222222-2222-2222-2222-222222222201','11111111-1111-1111-1111-111111111103','REFURBISHED','KA05HJ1237',20050,now(),current_date - 11,19700),
 ('22222222-2222-2222-2222-222222222201','11111111-1111-1111-1111-111111111104','REFURBISHED','KA05HJ1238',23880,now(),current_date - 13,23300),
 ('22222222-2222-2222-2222-222222222202','11111111-1111-1111-1111-111111111104','REFURBISHED','KA03MK4415',18300,now(),current_date - 6,18000),
 ('22222222-2222-2222-2222-222222222203','11111111-1111-1111-1111-111111111102','REFURBISHED','KA51NB7784',29700,now(),current_date - 4,29400),
 ('22222222-2222-2222-2222-222222222204','11111111-1111-1111-1111-111111111104','NEW','KA01EV9004',150,now(),current_date - 1,0),
 ('22222222-2222-2222-2222-222222222201','11111111-1111-1111-1111-111111111102','REFURBISHED','KA05HJ1239',16700,now(),current_date - 5,16400),
 ('22222222-2222-2222-2222-222222222202','11111111-1111-1111-1111-111111111101','REFURBISHED','KA03MK4416',25120,now(),current_date - 14,24500);
