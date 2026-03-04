-- Add unique public user IDs for invite system
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS unique_id text;

-- Helper to generate unique short codes
CREATE OR REPLACE FUNCTION public.generate_unique_code(_prefix text, _len int)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  candidate text;
BEGIN
  LOOP
    candidate := _prefix || upper(substring(md5(random()::text || clock_timestamp()::text || gen_random_uuid()::text) FROM 1 FOR _len));
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.invite_code = candidate OR p.unique_id = candidate
    );
  END LOOP;
  RETURN candidate;
END;
$$;

-- Ensure invite_code + unique_id are always present on new profiles
CREATE OR REPLACE FUNCTION public.ensure_profile_codes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.invite_code IS NULL OR NEW.invite_code = '' THEN
    NEW.invite_code := public.generate_unique_code('INV', 8);
  END IF;

  IF NEW.unique_id IS NULL OR NEW.unique_id = '' THEN
    NEW.unique_id := public.generate_unique_code('BR', 8);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_ensure_codes ON public.profiles;
CREATE TRIGGER trg_profiles_ensure_codes
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.ensure_profile_codes();

-- Backfill existing rows safely
UPDATE public.profiles
SET invite_code = public.generate_unique_code('INV', 8)
WHERE invite_code IS NULL OR invite_code = '';

UPDATE public.profiles
SET unique_id = public.generate_unique_code('BR', 8)
WHERE unique_id IS NULL OR unique_id = '';

CREATE UNIQUE INDEX IF NOT EXISTS profiles_unique_id_key ON public.profiles(unique_id);
CREATE UNIQUE INDEX IF NOT EXISTS profiles_invite_code_key ON public.profiles(invite_code);

ALTER TABLE public.profiles
ALTER COLUMN unique_id SET NOT NULL;

-- App rating + suggestion system
CREATE TABLE IF NOT EXISTS public.app_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  rating integer NOT NULL,
  suggestion text,
  feature_request text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT app_feedback_rating_range CHECK (rating BETWEEN 1 AND 5)
);

ALTER TABLE public.app_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create own feedback" ON public.app_feedback;
CREATE POLICY "Users can create own feedback"
ON public.app_feedback
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own feedback" ON public.app_feedback;
CREATE POLICY "Users can view own feedback"
ON public.app_feedback
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all feedback" ON public.app_feedback;
CREATE POLICY "Admins can view all feedback"
ON public.app_feedback
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Mind games score history
CREATE TABLE IF NOT EXISTS public.mind_game_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  game_type text NOT NULL,
  score integer NOT NULL DEFAULT 0,
  xp_earned integer NOT NULL DEFAULT 0,
  coins_earned integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.mind_game_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own game scores" ON public.mind_game_scores;
CREATE POLICY "Users can insert own game scores"
ON public.mind_game_scores
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own game scores" ON public.mind_game_scores;
CREATE POLICY "Users can view own game scores"
ON public.mind_game_scores
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all game scores" ON public.mind_game_scores;
CREATE POLICY "Admins can view all game scores"
ON public.mind_game_scores
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin-editable XP/coin rules
CREATE TABLE IF NOT EXISTS public.gamification_rules (
  id integer PRIMARY KEY,
  xp_per_level integer NOT NULL DEFAULT 100,
  focus_xp_seconds integer NOT NULL DEFAULT 15,
  focus_coin_seconds integer NOT NULL DEFAULT 30,
  invite_xp integer NOT NULL DEFAULT 50,
  invite_coins integer NOT NULL DEFAULT 25,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.gamification_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view gamification rules" ON public.gamification_rules;
CREATE POLICY "Anyone can view gamification rules"
ON public.gamification_rules
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admins can update gamification rules" ON public.gamification_rules;
CREATE POLICY "Admins can update gamification rules"
ON public.gamification_rules
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can insert gamification rules" ON public.gamification_rules;
CREATE POLICY "Admins can insert gamification rules"
ON public.gamification_rules
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.gamification_rules (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;