
-- 1) Prevent banned users from reading room chat history
DROP POLICY IF EXISTS "Room members can view room messages" ON public.study_room_messages;
CREATE POLICY "Room members can view room messages"
ON public.study_room_messages
FOR SELECT
TO authenticated
USING (
  public.is_study_room_member(room_id, auth.uid())
  AND NOT public.is_study_room_banned(room_id, auth.uid())
);

-- Also gate INSERT so banned members can't post
DROP POLICY IF EXISTS "Room members can send room messages" ON public.study_room_messages;
CREATE POLICY "Room members can send room messages"
ON public.study_room_messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND public.is_study_room_member(room_id, auth.uid())
  AND NOT public.is_study_room_banned(room_id, auth.uid())
);

-- 2) Allow room hosts to remove (kick) members
CREATE POLICY "Hosts can remove members from their rooms"
ON public.study_room_members
FOR DELETE
TO authenticated
USING (
  user_id <> auth.uid()  -- can't remove self via this policy (self-leave already covered)
  AND EXISTS (
    SELECT 1 FROM public.study_rooms r
    WHERE r.id = study_room_members.room_id
      AND r.owner_id = auth.uid()
  )
);

-- 3) Fix mutable search_path on immutable helper
CREATE OR REPLACE FUNCTION public.realtime_room_code_from_topic(_topic text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN _topic LIKE 'study-room-live-%' THEN substring(_topic FROM 17)
    WHEN _topic LIKE 'webrtc-%'          THEN substring(_topic FROM 8)
    ELSE NULL
  END
$function$;
