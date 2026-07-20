-- Extend chat_groups with description + avatar
ALTER TABLE public.chat_groups
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Helper: is admin of a group
CREATE OR REPLACE FUNCTION public.is_group_admin(_group_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = _group_id AND user_id = _user_id AND role = 'admin'
  );
$$;

-- Ban table
CREATE TABLE IF NOT EXISTS public.group_bans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.chat_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  banned_by uuid NOT NULL,
  reason text,
  banned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.group_bans TO authenticated;
GRANT ALL ON public.group_bans TO service_role;
ALTER TABLE public.group_bans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view group bans"
ON public.group_bans FOR SELECT TO authenticated
USING (public.is_group_admin(group_id, auth.uid()));

CREATE POLICY "Admins can insert group bans"
ON public.group_bans FOR INSERT TO authenticated
WITH CHECK (public.is_group_admin(group_id, auth.uid()) AND banned_by = auth.uid());

CREATE POLICY "Admins can remove group bans"
ON public.group_bans FOR DELETE TO authenticated
USING (public.is_group_admin(group_id, auth.uid()));

-- Helper: is banned from a group
CREATE OR REPLACE FUNCTION public.is_group_banned(_group_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_bans
    WHERE group_id = _group_id AND user_id = _user_id
  );
$$;

-- Update chat_groups UPDATE policy: allow any admin (not only creator)
DROP POLICY IF EXISTS "Creators can update groups" ON public.chat_groups;
CREATE POLICY "Admins can update groups"
ON public.chat_groups FOR UPDATE TO authenticated
USING (public.is_group_admin(id, auth.uid()))
WITH CHECK (public.is_group_admin(id, auth.uid()));

-- Allow admins to add group members (was: only creator)
DROP POLICY IF EXISTS "Creators can add group members" ON public.group_members;
CREATE POLICY "Admins can add group members"
ON public.group_members FOR INSERT TO authenticated
WITH CHECK (
  public.is_group_admin(group_id, auth.uid())
  AND NOT public.is_group_banned(group_id, user_id)
);

-- Admins can kick members (delete). Users can still leave (existing policy).
CREATE POLICY "Admins can kick members"
ON public.group_members FOR DELETE TO authenticated
USING (
  public.is_group_admin(group_id, auth.uid())
  AND user_id <> auth.uid()  -- don't kick self via this policy; use leave
);

-- Admins can update member roles (promote/demote)
CREATE POLICY "Admins can update member roles"
ON public.group_members FOR UPDATE TO authenticated
USING (public.is_group_admin(group_id, auth.uid()))
WITH CHECK (public.is_group_admin(group_id, auth.uid()));

-- Prevent banned users from sending messages
DROP POLICY IF EXISTS "Members can send group messages" ON public.group_messages;
CREATE POLICY "Members can send group messages"
ON public.group_messages FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND public.is_group_member(group_id, auth.uid())
  AND NOT public.is_group_banned(group_id, auth.uid())
);

-- Update join_group_by_invite to reject banned users
CREATE OR REPLACE FUNCTION public.join_group_by_invite(_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  gid uuid;
  recent_attempts integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM public.group_invite_attempts
  WHERE attempted_at < now() - interval '10 minutes';

  SELECT COUNT(*) INTO recent_attempts
  FROM public.group_invite_attempts
  WHERE user_id = auth.uid()
    AND attempted_at > now() - interval '10 minutes';

  IF recent_attempts >= 20 THEN
    RAISE EXCEPTION 'Too many invite attempts. Please wait a few minutes.';
  END IF;

  INSERT INTO public.group_invite_attempts (user_id) VALUES (auth.uid());

  SELECT id INTO gid FROM public.chat_groups WHERE invite_code = upper(trim(_code));
  IF gid IS NULL THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;

  IF public.is_group_banned(gid, auth.uid()) THEN
    RAISE EXCEPTION 'You are banned from this group';
  END IF;

  INSERT INTO public.group_members (group_id, user_id, role)
  VALUES (gid, auth.uid(), 'member')
  ON CONFLICT DO NOTHING;

  RETURN gid;
END;
$$;