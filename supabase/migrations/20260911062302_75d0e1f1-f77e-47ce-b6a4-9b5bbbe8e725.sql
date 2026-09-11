ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'viewer';

CREATE TABLE IF NOT EXISTS public.shared_datasets (
  kind text PRIMARY KEY,
  payload jsonb NOT NULL DEFAULT '[]'::jsonb,
  row_count integer NOT NULL DEFAULT 0,
  file_name text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT ON public.shared_datasets TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.shared_datasets TO authenticated;
GRANT ALL ON public.shared_datasets TO service_role;

ALTER TABLE public.shared_datasets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read shared datasets"
  ON public.shared_datasets FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage shared datasets"
  ON public.shared_datasets FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.shared_datasets;