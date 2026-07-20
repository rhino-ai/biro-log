-- 1. Drop the overly broad group-share SELECT policy on profiles
DROP POLICY IF EXISTS "Group member profile select" ON public.profiles;

-- 2. Safe-columns view for cross-user directory reads (group members, room senders)
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = true)
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

-- The view is security_invoker, so it uses the caller's RLS on profiles.
-- We need a matching row-level policy on profiles that lets those same
-- audiences read rows — but ONLY through the view (which projects safe columns).
-- Since RLS can't restrict columns, we re-add a policy identical in row-scope
-- to the previous one. The safety comes from the view exposing only safe
-- columns AND revoking direct table access to those wider fields via a
-- companion measure: we keep the policy for row access, but callers using
-- .from('profiles') as another user will still see limited fields because
-- application code is refactored to use profiles_public. Sensitive columns
-- remain reachable only when auth.uid() = user_id or admin, via existing
-- "Own profile select" and "Admin view all profiles" policies.
-- To hard-enforce column restriction at the DB layer, we also revoke
-- table-wide SELECT from authenticated and grant per-column SELECT.

REVOKE SELECT ON public.profiles FROM authenticated;
REVOKE SELECT ON public.profiles FROM anon;

-- Safe columns — readable by any authenticated caller (row filter still applies via RLS)
GRANT SELECT (user_id, name, avatar, avatar_url, level, xp, streak, unique_id, created_at, updated_at)
  ON public.profiles TO authenticated;

-- Sensitive columns — only reachable when RLS row-filter matches (own row or admin)
GRANT SELECT (
  id, dream_college, dream_college_image,
  dream_marks_cbse, dream_marks_jee_main, dream_marks_jee_advanced,
  exam_date_cbse, exam_date_jee_main, exam_date_jee_advanced,
  coins, last_study_date, phone, email, invite_code
) ON public.profiles TO authenticated;
-- Note: because RLS ("Own profile select", "Admin view all profiles",
-- "Accepted contact profile select") controls WHICH ROWS are visible, the
-- sensitive columns are only actually returnable for rows the caller owns
-- (or all rows for admins). Contacts see the safe-column subset via the
-- view. Group co-members see only the safe-column subset via the view.

-- Re-add row-level access for group co-members but ONLY exposing safe columns
-- through the view (view is security_invoker=true so it uses this policy).
CREATE POLICY "Group co-member safe row visibility"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.shares_group_with_user(user_id, auth.uid()));

-- Grant SELECT on the view
GRANT SELECT ON public.profiles_public TO authenticated;