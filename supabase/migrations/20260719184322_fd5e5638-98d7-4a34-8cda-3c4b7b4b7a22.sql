CREATE OR REPLACE FUNCTION public.is_group_creator(_group_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.chat_groups
    WHERE id = _group_id
      AND created_by = _user_id
  );
$$;

DROP POLICY IF EXISTS "Members can view groups" ON public.chat_groups;
CREATE POLICY "Members can view groups"
ON public.chat_groups
FOR SELECT
TO authenticated
USING (is_public = true OR public.is_group_member(id, auth.uid()));

DROP POLICY IF EXISTS "Creators can add group members" ON public.group_members;
CREATE POLICY "Creators can add group members"
ON public.group_members
FOR INSERT
TO authenticated
WITH CHECK (public.is_group_creator(group_id, auth.uid()));

DROP POLICY IF EXISTS "Members can view group messages" ON public.group_messages;
CREATE POLICY "Members can view group messages"
ON public.group_messages
FOR SELECT
TO authenticated
USING (public.is_group_member(group_id, auth.uid()));

DROP POLICY IF EXISTS "Members can send group messages" ON public.group_messages;
CREATE POLICY "Members can send group messages"
ON public.group_messages
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = sender_id AND public.is_group_member(group_id, auth.uid()));

DROP TRIGGER IF EXISTS trg_group_invite_code ON public.chat_groups;

GRANT EXECUTE ON FUNCTION public.is_group_creator(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_group_creator(uuid, uuid) TO service_role;