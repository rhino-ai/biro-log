-- 1. Make the directory view caller-privileged (satisfies linter)
ALTER VIEW public.profiles_public SET (security_invoker = true);

-- 2. Row policy so group co-members can SELECT rows through the view.
--    Column-level GRANTs below ensure they only see safe columns even if
--    they query the base table directly.
CREATE POLICY "Group co-member row read"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.shares_group_with_user(user_id, auth.uid()));

-- 3. Column-level lockdown: revoke everything then grant only safe columns
REVOKE SELECT ON public.profiles FROM authenticated;
REVOKE SELECT ON public.profiles FROM anon;

GRANT SELECT (
  id, user_id, name, avatar, avatar_url,
  level, xp, streak, unique_id, invite_code,
  created_at, updated_at
) ON public.profiles TO authenticated;

-- 4. Secure function so the owner can still read their own sensitive fields
CREATE OR REPLACE FUNCTION public.get_my_full_profile()
RETURNS public.profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.profiles WHERE user_id = auth.uid();
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_full_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_full_profile() TO authenticated;

-- 5. Secure function for admins to read any user's full profile
CREATE OR REPLACE FUNCTION public.admin_get_full_profile(_user_id uuid)
RETURNS public.profiles
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.profiles;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT * INTO result FROM public.profiles WHERE user_id = _user_id;
  RETURN result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_get_full_profile(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_full_profile(uuid) TO authenticated;