-- Fix recursive group/profile policies with security-definer helpers
CREATE OR REPLACE FUNCTION public.is_group_member(_group_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_members gm
    WHERE gm.group_id = _group_id
      AND gm.user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.shares_group_with_user(_profile_user_id uuid, _viewer_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_members viewer
    JOIN public.group_members target ON target.group_id = viewer.group_id
    WHERE viewer.user_id = _viewer_id
      AND target.user_id = _profile_user_id
  );
$$;

REVOKE ALL ON FUNCTION public.is_group_member(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_group_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_group_member(uuid, uuid) TO service_role;

REVOKE ALL ON FUNCTION public.shares_group_with_user(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.shares_group_with_user(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.shares_group_with_user(uuid, uuid) TO service_role;

DROP POLICY IF EXISTS "Members can view membership" ON public.group_members;
CREATE POLICY "Members can view membership"
ON public.group_members
FOR SELECT
TO authenticated
USING (public.is_group_member(group_id, auth.uid()));

DROP POLICY IF EXISTS "Group member profile select" ON public.profiles;
CREATE POLICY "Group member profile select"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.shares_group_with_user(user_id, auth.uid()));

-- Ensure group invite codes and creator membership are automatic
CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_groups_invite_code_unique
ON public.chat_groups (invite_code)
WHERE invite_code IS NOT NULL;

DROP TRIGGER IF EXISTS set_group_invite_code ON public.chat_groups;
CREATE TRIGGER set_group_invite_code
BEFORE INSERT ON public.chat_groups
FOR EACH ROW
EXECUTE FUNCTION public.generate_group_invite_code();

CREATE OR REPLACE FUNCTION public.add_group_creator_member()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.group_members (group_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'admin')
  ON CONFLICT (group_id, user_id) DO UPDATE SET role = 'admin';
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.add_group_creator_member() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_group_creator_member() TO service_role;

DROP TRIGGER IF EXISTS add_creator_as_group_admin ON public.chat_groups;
CREATE TRIGGER add_creator_as_group_admin
AFTER INSERT ON public.chat_groups
FOR EACH ROW
EXECUTE FUNCTION public.add_group_creator_member();

CREATE INDEX IF NOT EXISTS idx_direct_messages_pair_created
ON public.direct_messages (sender_id, receiver_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_group_messages_group_created
ON public.group_messages (group_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_group_members_user_group
ON public.group_members (user_id, group_id);

CREATE INDEX IF NOT EXISTS idx_profiles_unique_id
ON public.profiles (unique_id);

CREATE INDEX IF NOT EXISTS idx_profiles_invite_code
ON public.profiles (invite_code);

-- Persistent virtual library rooms
CREATE TABLE IF NOT EXISTS public.study_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  title text NOT NULL,
  owner_id uuid NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_rooms TO authenticated;
GRANT ALL ON public.study_rooms TO service_role;

ALTER TABLE public.study_rooms ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.study_room_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.study_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(room_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_room_members TO authenticated;
GRANT ALL ON public.study_room_members TO service_role;

ALTER TABLE public.study_room_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.study_room_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.study_rooms(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_room_messages TO authenticated;
GRANT ALL ON public.study_room_messages TO service_role;

ALTER TABLE public.study_room_messages ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_study_room_member(_room_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.study_room_members srm
    WHERE srm.room_id = _room_id
      AND srm.user_id = _user_id
  );
$$;

REVOKE ALL ON FUNCTION public.is_study_room_member(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_study_room_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_study_room_member(uuid, uuid) TO service_role;

DROP POLICY IF EXISTS "Room members can view rooms" ON public.study_rooms;
CREATE POLICY "Room members can view rooms"
ON public.study_rooms
FOR SELECT
TO authenticated
USING (owner_id = auth.uid() OR public.is_study_room_member(id, auth.uid()));

DROP POLICY IF EXISTS "Users can create study rooms" ON public.study_rooms;
CREATE POLICY "Users can create study rooms"
ON public.study_rooms
FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Owners can update study rooms" ON public.study_rooms;
CREATE POLICY "Owners can update study rooms"
ON public.study_rooms
FOR UPDATE
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Owners can delete study rooms" ON public.study_rooms;
CREATE POLICY "Owners can delete study rooms"
ON public.study_rooms
FOR DELETE
TO authenticated
USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Room members can view members" ON public.study_room_members;
CREATE POLICY "Room members can view members"
ON public.study_room_members
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_study_room_member(room_id, auth.uid()));

DROP POLICY IF EXISTS "Users can join rooms" ON public.study_room_members;
CREATE POLICY "Users can join rooms"
ON public.study_room_members
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own room presence" ON public.study_room_members;
CREATE POLICY "Users can update own room presence"
ON public.study_room_members
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can leave study rooms" ON public.study_room_members;
CREATE POLICY "Users can leave study rooms"
ON public.study_room_members
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Room members can view room messages" ON public.study_room_messages;
CREATE POLICY "Room members can view room messages"
ON public.study_room_messages
FOR SELECT
TO authenticated
USING (public.is_study_room_member(room_id, auth.uid()));

DROP POLICY IF EXISTS "Room members can send room messages" ON public.study_room_messages;
CREATE POLICY "Room members can send room messages"
ON public.study_room_messages
FOR INSERT
TO authenticated
WITH CHECK (sender_id = auth.uid() AND public.is_study_room_member(room_id, auth.uid()));

DROP POLICY IF EXISTS "Users can delete own room messages" ON public.study_room_messages;
CREATE POLICY "Users can delete own room messages"
ON public.study_room_messages
FOR DELETE
TO authenticated
USING (sender_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_study_rooms_code ON public.study_rooms (code);
CREATE INDEX IF NOT EXISTS idx_study_room_members_room ON public.study_room_members (room_id, user_id);
CREATE INDEX IF NOT EXISTS idx_study_room_members_user ON public.study_room_members (user_id);
CREATE INDEX IF NOT EXISTS idx_study_room_messages_room_created ON public.study_room_messages (room_id, created_at DESC);

DROP TRIGGER IF EXISTS update_study_rooms_updated_at ON public.study_rooms;
CREATE TRIGGER update_study_rooms_updated_at
BEFORE UPDATE ON public.study_rooms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.study_rooms REPLICA IDENTITY FULL;
ALTER TABLE public.study_room_members REPLICA IDENTITY FULL;
ALTER TABLE public.study_room_messages REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'study_rooms'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.study_rooms;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'study_room_members'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.study_room_members;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'study_room_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.study_room_messages;
  END IF;
END $$;