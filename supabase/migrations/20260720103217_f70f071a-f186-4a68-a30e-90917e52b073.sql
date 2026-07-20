
CREATE TABLE IF NOT EXISTS public.study_room_bans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES public.study_rooms(id) ON DELETE CASCADE,
  host_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope text NOT NULL DEFAULT 'room' CHECK (scope IN ('room','host_all')),
  expires_at timestamptz,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_srb_user ON public.study_room_bans(user_id);
CREATE INDEX IF NOT EXISTS idx_srb_room ON public.study_room_bans(room_id);
CREATE INDEX IF NOT EXISTS idx_srb_host ON public.study_room_bans(host_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_room_bans TO authenticated;
GRANT ALL ON public.study_room_bans TO service_role;

ALTER TABLE public.study_room_bans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Banned user sees own bans"
  ON public.study_room_bans FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR host_id = auth.uid());

CREATE POLICY "Host creates bans"
  ON public.study_room_bans FOR INSERT TO authenticated
  WITH CHECK (host_id = auth.uid());

CREATE POLICY "Host updates own bans"
  ON public.study_room_bans FOR UPDATE TO authenticated
  USING (host_id = auth.uid())
  WITH CHECK (host_id = auth.uid());

CREATE POLICY "Host deletes own bans"
  ON public.study_room_bans FOR DELETE TO authenticated
  USING (host_id = auth.uid());

-- Helper to check active ban
CREATE OR REPLACE FUNCTION public.is_study_room_banned(_room_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.study_room_bans b
    JOIN public.study_rooms r ON r.id = _room_id
    WHERE b.user_id = _user_id
      AND (b.expires_at IS NULL OR b.expires_at > now())
      AND (
        (b.scope = 'room' AND b.room_id = _room_id)
        OR (b.scope = 'host_all' AND b.host_id = r.owner_id)
      )
  );
$$;

-- Replace join RPC to enforce bans
CREATE OR REPLACE FUNCTION public.join_study_room_by_code(_code text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
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

  IF public.is_study_room_banned(rid, auth.uid()) THEN
    RAISE EXCEPTION 'You are banned from this room';
  END IF;

  INSERT INTO public.study_room_members (room_id, user_id, role, last_seen_at)
  VALUES (rid, auth.uid(), CASE WHEN is_owner THEN 'host' ELSE 'member' END, now())
  ON CONFLICT (room_id, user_id)
  DO UPDATE SET last_seen_at = now();

  RETURN rid;
END;
$$;
