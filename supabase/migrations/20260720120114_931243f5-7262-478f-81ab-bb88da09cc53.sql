-- 1. Remove the mistaken policy that let group co-members read sensitive columns
DROP POLICY IF EXISTS "Group co-member safe row visibility" ON public.profiles;

-- 2. Restore standard table grant (RLS enforces row scope)
GRANT SELECT ON public.profiles TO authenticated;

-- 3. Rebuild the safe-columns view as owner-privileged (bypasses RLS on profiles)
--    with its own audience filter in the WHERE clause. Only safe columns are
--    projected, so no sensitive data can leak through this view.
DROP VIEW IF EXISTS public.profiles_public;

CREATE VIEW public.profiles_public
WITH (security_invoker = false)
AS
SELECT
  p.user_id,
  p.name,
  p.avatar,
  p.avatar_url,
  p.level,
  p.xp,
  p.streak,
  p.unique_id
FROM public.profiles p
WHERE
  p.user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.shares_group_with_user(p.user_id, auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.contacts a
    JOIN public.contacts b
      ON b.user_id = a.contact_user_id
     AND b.contact_user_id = a.user_id
    WHERE a.user_id = auth.uid()
      AND a.contact_user_id = p.user_id
      AND a.status = 'accepted'
      AND b.status = 'accepted'
  );

GRANT SELECT ON public.profiles_public TO authenticated;

-- Now direct SELECT on public.profiles is only permitted (via RLS) for:
--   * own row  (Own profile select)
--   * accepted contacts (Accepted contact profile select)  -- pre-existing product behavior
--   * admins (Admin view all profiles)
-- Group co-members can no longer read profiles rows directly at all;
-- they must go through public.profiles_public which exposes only safe columns.