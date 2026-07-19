CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_profiles_name_trgm ON public.profiles USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_profiles_unique_id_trgm ON public.profiles USING gin (unique_id gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_direct_messages_users_created ON public.direct_messages (sender_id, receiver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_messages_group_created ON public.group_messages (group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_members_user_group ON public.group_members (user_id, group_id);

CREATE TABLE IF NOT EXISTS public.group_invite_attempts (
  user_id uuid NOT NULL,
  attempted_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT, SELECT, DELETE ON public.group_invite_attempts TO authenticated;
GRANT ALL ON public.group_invite_attempts TO service_role;
ALTER TABLE public.group_invite_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own invite attempts" ON public.group_invite_attempts;
CREATE POLICY "Users manage own invite attempts" ON public.group_invite_attempts
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_group_invite_attempts_user_time ON public.group_invite_attempts (user_id, attempted_at DESC);

CREATE OR REPLACE FUNCTION public.join_group_by_invite(_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  INSERT INTO public.group_members (group_id, user_id, role)
  VALUES (gid, auth.uid(), 'member')
  ON CONFLICT DO NOTHING;

  RETURN gid;
END;
$function$;

REVOKE ALL ON FUNCTION public.join_group_by_invite(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_group_by_invite(text) TO authenticated;