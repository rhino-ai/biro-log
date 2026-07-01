
-- 1. FIX profiles_full_enumeration + profiles_email_phone_public
-- Drop broad SELECT policies and re-add scoped ones
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view contact profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view group member profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins view profiles" ON public.profiles;

CREATE POLICY "Own profile select"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Contact profile select"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.contacts
      WHERE user_id = auth.uid() AND contact_user_id = profiles.user_id
    )
  );

CREATE POLICY "Group member profile select"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm1
      JOIN public.group_members gm2 ON gm1.group_id = gm2.group_id
      WHERE gm1.user_id = auth.uid() AND gm2.user_id = profiles.user_id
    )
  );

CREATE POLICY "Admin view all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 2. FIX gamification_stat_manipulation
-- Prevent regular users from directly modifying xp/level/coins via API.
CREATE OR REPLACE FUNCTION public.prevent_stat_manipulation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- service_role bypass: no JWT claims => allow
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  -- Admins may edit anyone's stats
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  -- Regular users: block changes to protected stat columns
  IF NEW.xp IS DISTINCT FROM OLD.xp
     OR NEW.level IS DISTINCT FROM OLD.level
     OR NEW.coins IS DISTINCT FROM OLD.coins
     OR NEW.streak IS DISTINCT FROM OLD.streak THEN
    RAISE EXCEPTION 'Cannot modify gamification stats directly. Use server-side actions.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_stat_manipulation ON public.profiles;
CREATE TRIGGER trg_prevent_stat_manipulation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_stat_manipulation();

-- Tighten UPDATE policy with WITH CHECK
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. FIX chat_preferences_no_select_for_anon: restrict to authenticated
DROP POLICY IF EXISTS "view own prefs" ON public.chat_preferences;
DROP POLICY IF EXISTS "insert own prefs" ON public.chat_preferences;
DROP POLICY IF EXISTS "update own prefs" ON public.chat_preferences;
DROP POLICY IF EXISTS "delete own prefs" ON public.chat_preferences;

CREATE POLICY "view own prefs" ON public.chat_preferences
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert own prefs" ON public.chat_preferences
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update own prefs" ON public.chat_preferences
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete own prefs" ON public.chat_preferences
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 4. FIX realtime_no_channel_policies: remove message tables from realtime publication.
-- Clients cannot subscribe to row-changes on tables that aren't published.
ALTER PUBLICATION supabase_realtime DROP TABLE public.direct_messages;
ALTER PUBLICATION supabase_realtime DROP TABLE public.group_messages;

-- 5. FIX admin_codes_hardcoded: drop RPC that hardcodes plaintext codes.
-- Codes will now be verified server-side inside an edge function that reads
-- them from encrypted secrets (ADMIN_STEP_ONE / ADMIN_STEP_TWO).
DROP FUNCTION IF EXISTS public.verify_admin_step_codes(text, text);

-- 6. FIX SUPA_authenticated_security_definer_function_executable:
-- Revoke EXECUTE on SECURITY DEFINER helpers that don't need to be callable
-- by end users. Trigger functions and RLS-invoked has_role stay callable.
REVOKE EXECUTE ON FUNCTION public.generate_unique_code(text, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ensure_profile_codes() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_and_assign_first_admin() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_stat_manipulation() FROM PUBLIC, anon, authenticated;

-- 7. Rate limiting log table for edge functions
CREATE TABLE IF NOT EXISTS public.edge_rate_limit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.edge_rate_limit_log TO authenticated;
GRANT ALL ON public.edge_rate_limit_log TO service_role;

ALTER TABLE public.edge_rate_limit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own rate log read"
  ON public.edge_rate_limit_log FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "own rate log insert"
  ON public.edge_rate_limit_log FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_rate_limit_user_endpoint_time
  ON public.edge_rate_limit_log(user_id, endpoint, created_at DESC);
