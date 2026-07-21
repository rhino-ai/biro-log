-- Fix realtime channel bypass for study rooms
-- Extract room code from a realtime topic name
CREATE OR REPLACE FUNCTION public.realtime_room_code_from_topic(_topic text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN _topic LIKE 'study-room-live-%' THEN substring(_topic FROM 17)
    WHEN _topic LIKE 'webrtc-%'          THEN substring(_topic FROM 8)
    ELSE NULL
  END
$$;

-- Authoritative membership check for a realtime topic
CREATE OR REPLACE FUNCTION public.can_use_study_room_topic(_topic text, _uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.study_rooms r
    JOIN public.study_room_members m
      ON m.room_id = r.id AND m.user_id = _uid
    WHERE r.is_active = true
      AND r.code = public.realtime_room_code_from_topic(_topic)
      AND NOT public.is_study_room_banned(r.id, _uid)
  );
$$;

REVOKE ALL ON FUNCTION public.can_use_study_room_topic(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_use_study_room_topic(text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.realtime_room_code_from_topic(text) TO authenticated, anon, service_role;

-- Realtime authorization: only members of the study room may read/publish
-- on its private study-room-live-* and webrtc-* topics.
DROP POLICY IF EXISTS "study_room_realtime_select" ON realtime.messages;
DROP POLICY IF EXISTS "study_room_realtime_insert" ON realtime.messages;

CREATE POLICY "study_room_realtime_select"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  (
    (realtime.topic() LIKE 'study-room-live-%' OR realtime.topic() LIKE 'webrtc-%')
    AND public.can_use_study_room_topic(realtime.topic(), auth.uid())
  )
);

CREATE POLICY "study_room_realtime_insert"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  (
    (realtime.topic() LIKE 'study-room-live-%' OR realtime.topic() LIKE 'webrtc-%')
    AND public.can_use_study_room_topic(realtime.topic(), auth.uid())
  )
);

-- Tighten study_rooms visibility so codes are not enumerable by non-members.
DROP POLICY IF EXISTS "Anyone can view active rooms" ON public.study_rooms;
DROP POLICY IF EXISTS "Authenticated can view active rooms" ON public.study_rooms;
DROP POLICY IF EXISTS "Members and owner can view study rooms" ON public.study_rooms;

CREATE POLICY "Members and owner can view study rooms"
ON public.study_rooms
FOR SELECT
TO authenticated
USING (
  owner_id = auth.uid()
  OR public.is_study_room_member(id, auth.uid())
);