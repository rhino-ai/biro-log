DROP POLICY IF EXISTS "Room members can view rooms" ON public.study_rooms;
CREATE POLICY "Signed-in users can find active rooms"
ON public.study_rooms
FOR SELECT
TO authenticated
USING (is_active = true OR owner_id = auth.uid() OR public.is_study_room_member(id, auth.uid()));