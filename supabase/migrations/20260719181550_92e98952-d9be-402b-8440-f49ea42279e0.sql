DROP POLICY IF EXISTS "Can add members" ON public.group_members;
CREATE POLICY "Creators can add group members"
ON public.group_members
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.chat_groups g
    WHERE g.id = group_members.group_id
      AND g.created_by = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can leave groups" ON public.group_members;
CREATE POLICY "Users can leave groups"
ON public.group_members
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);