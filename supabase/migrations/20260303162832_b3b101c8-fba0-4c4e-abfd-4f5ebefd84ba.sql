-- Apply what was missed after the error
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS invite_code text UNIQUE;
UPDATE public.profiles SET invite_code = LOWER(SUBSTR(md5(random()::text), 1, 10)) WHERE invite_code IS NULL;

DROP POLICY IF EXISTS "Users can view contact profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view group member profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "Authenticated users can view profiles"
ON public.profiles FOR SELECT TO authenticated
USING (true);