
-- 1. Drop legacy plaintext user_secrets table
DROP TABLE IF EXISTS public.user_secrets CASCADE;

-- 2. Study rooms: force joining via secure RPC that validates the code
DROP POLICY IF EXISTS "Users can join rooms" ON public.study_room_members;
CREATE POLICY "Owners can add themselves to their rooms"
ON public.study_room_members
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.study_rooms sr
    WHERE sr.id = study_room_members.room_id
      AND sr.owner_id = auth.uid()
  )
);

CREATE OR REPLACE FUNCTION public.join_study_room_by_code(_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rid uuid;
  is_owner boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT id, (owner_id = auth.uid()) INTO rid, is_owner
  FROM public.study_rooms
  WHERE code = upper(trim(_code)) AND is_active = true;

  IF rid IS NULL THEN
    RAISE EXCEPTION 'Invalid or inactive room code';
  END IF;

  INSERT INTO public.study_room_members (room_id, user_id, role, last_seen_at)
  VALUES (rid, auth.uid(), CASE WHEN is_owner THEN 'host' ELSE 'member' END, now())
  ON CONFLICT (room_id, user_id)
  DO UPDATE SET last_seen_at = now();

  RETURN rid;
END;
$$;

REVOKE ALL ON FUNCTION public.join_study_room_by_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_study_room_by_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_study_room_by_code(text) TO service_role;

-- 3. Group members: block admins from self-modifying roles or demoting the creator
DROP POLICY IF EXISTS "Admins can update member roles" ON public.group_members;
CREATE POLICY "Admins can update member roles"
ON public.group_members
FOR UPDATE
TO authenticated
USING (
  public.is_group_admin(group_id, auth.uid())
  AND user_id <> auth.uid()
  AND NOT public.is_group_creator(group_id, user_id)
)
WITH CHECK (
  public.is_group_admin(group_id, auth.uid())
  AND user_id <> auth.uid()
  AND NOT public.is_group_creator(group_id, user_id)
);
