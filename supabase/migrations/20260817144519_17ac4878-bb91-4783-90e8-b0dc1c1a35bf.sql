ALTER TABLE public.kyc_cases
  ADD COLUMN IF NOT EXISTS dl_front_path text,
  ADD COLUMN IF NOT EXISTS dl_back_path text,
  ADD COLUMN IF NOT EXISTS selfie_path text,
  ADD COLUMN IF NOT EXISTS address_proof_path text,
  ADD COLUMN IF NOT EXISTS address_proof_type text;

CREATE POLICY "Riders can upload their own KYC files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'kyc-docs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Riders can read their own KYC files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'kyc-docs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Riders can replace their own KYC files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'kyc-docs' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'kyc-docs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Riders can delete their own KYC files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'kyc-docs' AND (storage.foldername(name))[1] = auth.uid()::text);