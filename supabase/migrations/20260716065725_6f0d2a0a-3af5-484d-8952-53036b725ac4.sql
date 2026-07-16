
-- 1) Profiles: remove broad read policy, add own-profile read
DROP POLICY IF EXISTS "Authenticated can view all profiles" ON public.profiles;

CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- 2) Revoke EXECUTE from PUBLIC/authenticated on trigger-only SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_bootstrap() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
-- Note: has_role() must remain executable so RLS policies referencing it work
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
