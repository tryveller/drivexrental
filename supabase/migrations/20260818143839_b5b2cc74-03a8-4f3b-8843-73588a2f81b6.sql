ALTER TABLE public.kyc_cases ADD COLUMN IF NOT EXISTS pan_path text;

CREATE TABLE IF NOT EXISTS public.customer_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doc_type text NOT NULL,
  path text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (customer_id, doc_type)
);

GRANT SELECT ON public.customer_documents TO authenticated;
GRANT ALL ON public.customer_documents TO service_role;

ALTER TABLE public.customer_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Riders can view their own saved documents"
ON public.customer_documents FOR SELECT TO authenticated
USING (customer_id = auth.uid());

CREATE POLICY "Staff can view saved documents"
ON public.customer_documents FOR SELECT TO authenticated
USING (public.is_staff(auth.uid()));

CREATE TRIGGER customer_documents_updated_at
BEFORE UPDATE ON public.customer_documents
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();