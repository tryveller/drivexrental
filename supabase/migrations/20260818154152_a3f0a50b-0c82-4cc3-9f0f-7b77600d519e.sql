ALTER TABLE public.eligibility_checks
  ADD COLUMN IF NOT EXISTS aadhaar_front_path text,
  ADD COLUMN IF NOT EXISTS aadhaar_back_path text,
  ADD COLUMN IF NOT EXISTS pan_path text,
  ADD COLUMN IF NOT EXISTS method text NOT NULL DEFAULT 'UPLOAD';

ALTER TABLE public.kyc_cases
  ADD COLUMN IF NOT EXISTS aadhaar_front_path text,
  ADD COLUMN IF NOT EXISTS aadhaar_back_path text,
  ADD COLUMN IF NOT EXISTS verification_method text NOT NULL DEFAULT 'UPLOAD';