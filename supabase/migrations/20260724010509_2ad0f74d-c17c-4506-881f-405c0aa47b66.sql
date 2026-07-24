
-- Auto-remove membership when a user is banned from a room so they immediately lose SELECT access to messages/members.
CREATE OR REPLACE FUNCTION public.enforce_study_room_ban_removal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.scope = 'room' AND NEW.room_id IS NOT NULL THEN
    DELETE FROM public.study_room_members
    WHERE room_id = NEW.room_id AND user_id = NEW.user_id;
  ELSIF NEW.scope = 'host_all' AND NEW.host_id IS NOT NULL THEN
    DELETE FROM public.study_room_members m
    USING public.study_rooms r
    WHERE m.room_id = r.id
      AND r.owner_id = NEW.host_id
      AND m.user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_study_room_ban_removal ON public.study_room_bans;
CREATE TRIGGER trg_enforce_study_room_ban_removal
AFTER INSERT ON public.study_room_bans
FOR EACH ROW EXECUTE FUNCTION public.enforce_study_room_ban_removal();
