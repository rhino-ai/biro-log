-- Hot Question owner panel backend
CREATE TABLE IF NOT EXISTS public.daily_hot_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  admin_id uuid,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  image_url text,
  kind text NOT NULL DEFAULT 'text' CHECK (kind IN ('text', 'poll', 'image', 'quiz')),
  schedule_basis text NOT NULL DEFAULT 'daily' CHECK (schedule_basis IN ('daily', 'weekly', 'monthly', 'yearly')),
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  poll_options jsonb NOT NULL DEFAULT '[]'::jsonb,
  quiz_options jsonb NOT NULL DEFAULT '[]'::jsonb,
  correct_answer text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_hot_questions TO authenticated;
GRANT ALL ON public.daily_hot_questions TO service_role;

ALTER TABLE public.daily_hot_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view hot questions" ON public.daily_hot_questions;
DROP POLICY IF EXISTS "Admins can manage hot questions" ON public.daily_hot_questions;
DROP POLICY IF EXISTS "Authenticated users can view active hot questions" ON public.daily_hot_questions;
DROP POLICY IF EXISTS "Owners and admins can manage hot questions" ON public.daily_hot_questions;

CREATE POLICY "Authenticated users can view active hot questions"
ON public.daily_hot_questions
FOR SELECT
TO authenticated
USING (is_active = true OR owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owners and admins can manage hot questions"
ON public.daily_hot_questions
FOR ALL
TO authenticated
USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER daily_hot_questions_updated_at
BEFORE UPDATE ON public.daily_hot_questions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.daily_hot_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.daily_hot_questions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL DEFAULT '',
  selected_option text,
  is_correct boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (question_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_hot_answers TO authenticated;
GRANT ALL ON public.daily_hot_answers TO service_role;

ALTER TABLE public.daily_hot_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view answers" ON public.daily_hot_answers;
DROP POLICY IF EXISTS "Users can insert answers" ON public.daily_hot_answers;
DROP POLICY IF EXISTS "Users can update own answers" ON public.daily_hot_answers;
DROP POLICY IF EXISTS "Admins can mark answers correct" ON public.daily_hot_answers;
DROP POLICY IF EXISTS "Users can view hot question answers" ON public.daily_hot_answers;
DROP POLICY IF EXISTS "Users can answer hot questions" ON public.daily_hot_answers;
DROP POLICY IF EXISTS "Users can update own hot question answers" ON public.daily_hot_answers;
DROP POLICY IF EXISTS "Owners can mark hot question answers" ON public.daily_hot_answers;

CREATE POLICY "Users can view hot question answers"
ON public.daily_hot_answers
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.daily_hot_questions q
    WHERE q.id = question_id
      AND (q.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role) OR q.is_active = true)
  )
);

CREATE POLICY "Users can answer hot questions"
ON public.daily_hot_answers
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own hot question answers"
ON public.daily_hot_answers
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Owners can mark hot question answers"
ON public.daily_hot_answers
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.daily_hot_questions q
    WHERE q.id = question_id
      AND (q.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.daily_hot_questions q
    WHERE q.id = question_id
      AND (q.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
  )
);

-- Tracker collaboration backend
CREATE TABLE IF NOT EXISTS public.tracker_sheet_collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tracker_id uuid NOT NULL REFERENCES public.tracker_sheets(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  collaborator_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'editor' CHECK (role IN ('viewer', 'editor')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tracker_id, collaborator_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tracker_sheet_collaborators TO authenticated;
GRANT ALL ON public.tracker_sheet_collaborators TO service_role;

ALTER TABLE public.tracker_sheet_collaborators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tracker owners manage collaborators" ON public.tracker_sheet_collaborators;
DROP POLICY IF EXISTS "Collaborators can view their tracker shares" ON public.tracker_sheet_collaborators;

CREATE POLICY "Tracker owners manage collaborators"
ON public.tracker_sheet_collaborators
FOR ALL
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (
  owner_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.tracker_sheets t
    WHERE t.id = tracker_id AND t.user_id = auth.uid()
  )
);

CREATE POLICY "Collaborators can view their tracker shares"
ON public.tracker_sheet_collaborators
FOR SELECT
TO authenticated
USING (collaborator_id = auth.uid());

DROP POLICY IF EXISTS "Users manage own trackers" ON public.tracker_sheets;
DROP POLICY IF EXISTS "Tracker owners can manage trackers" ON public.tracker_sheets;
DROP POLICY IF EXISTS "Tracker collaborators can view shared trackers" ON public.tracker_sheets;
DROP POLICY IF EXISTS "Tracker editors can update shared trackers" ON public.tracker_sheets;

CREATE POLICY "Tracker owners can manage trackers"
ON public.tracker_sheets
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Tracker collaborators can view shared trackers"
ON public.tracker_sheets
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tracker_sheet_collaborators c
    WHERE c.tracker_id = tracker_sheets.id
      AND c.collaborator_id = auth.uid()
  )
);

CREATE POLICY "Tracker editors can update shared trackers"
ON public.tracker_sheets
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tracker_sheet_collaborators c
    WHERE c.tracker_id = tracker_sheets.id
      AND c.collaborator_id = auth.uid()
      AND c.role = 'editor'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tracker_sheet_collaborators c
    WHERE c.tracker_id = tracker_sheets.id
      AND c.collaborator_id = auth.uid()
      AND c.role = 'editor'
  )
);

-- Safe activity logging helper; direct activity_log writes can stay restricted.
CREATE OR REPLACE FUNCTION public.log_my_activity(_type text, _message text, _xp_earned integer DEFAULT 0, _coins_earned integer DEFAULT 0)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.activity_log (user_id, type, message, xp_earned, coins_earned)
  VALUES (auth.uid(), left(coalesce(_type, 'task'), 40), left(coalesce(_message, ''), 500), coalesce(_xp_earned, 0), coalesce(_coins_earned, 0))
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_my_activity(text, text, integer, integer) TO authenticated;

-- Realtime for tracker collaboration. Ignore duplicate-publication errors.
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tracker_sheets;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tracker_sheet_collaborators;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;