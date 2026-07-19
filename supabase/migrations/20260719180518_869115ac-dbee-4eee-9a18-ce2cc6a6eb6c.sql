
-- Group invite codes
ALTER TABLE public.chat_groups ADD COLUMN IF NOT EXISTS invite_code text UNIQUE;

CREATE OR REPLACE FUNCTION public.generate_group_invite_code()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.invite_code IS NULL OR NEW.invite_code = '' THEN
    LOOP
      NEW.invite_code := 'GRP' || upper(substring(md5(random()::text || clock_timestamp()::text) FROM 1 FOR 8));
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.chat_groups WHERE invite_code = NEW.invite_code);
    END LOOP;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_group_invite_code ON public.chat_groups;
CREATE TRIGGER trg_group_invite_code BEFORE INSERT ON public.chat_groups
FOR EACH ROW EXECUTE FUNCTION public.generate_group_invite_code();

UPDATE public.chat_groups SET invite_code = 'GRP' || upper(substring(md5(id::text) FROM 1 FOR 8)) WHERE invite_code IS NULL;

-- Join group by invite code (security definer bypasses restrictive INSERT policy)
CREATE OR REPLACE FUNCTION public.join_group_by_invite(_code text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE gid uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT id INTO gid FROM public.chat_groups WHERE invite_code = _code;
  IF gid IS NULL THEN RAISE EXCEPTION 'Invalid invite code'; END IF;
  INSERT INTO public.group_members (group_id, user_id, role)
    VALUES (gid, auth.uid(), 'member')
    ON CONFLICT DO NOTHING;
  RETURN gid;
END; $$;

-- Also allow joining any group when you know its id (for invite link with id)
DROP POLICY IF EXISTS "Can add members" ON public.group_members;
CREATE POLICY "Can add members" ON public.group_members FOR INSERT
WITH CHECK (
  (EXISTS (SELECT 1 FROM chat_groups g WHERE g.id = group_members.group_id AND g.created_by = auth.uid()))
  OR (auth.uid() = user_id)
);

-- Enable realtime
ALTER TABLE public.direct_messages REPLICA IDENTITY FULL;
ALTER TABLE public.group_messages REPLICA IDENTITY FULL;
ALTER TABLE public.group_members REPLICA IDENTITY FULL;
ALTER TABLE public.chat_groups REPLICA IDENTITY FULL;

DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.group_messages; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.group_members; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_groups; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

GRANT EXECUTE ON FUNCTION public.join_group_by_invite(text) TO authenticated;
