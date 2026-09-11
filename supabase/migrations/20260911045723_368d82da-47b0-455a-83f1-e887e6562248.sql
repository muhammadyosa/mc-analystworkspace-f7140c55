ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen_at timestamp with time zone;
GRANT SELECT ON public.profiles TO authenticated;