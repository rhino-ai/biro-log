
-- Restore table grants that were dropped previously (RLS still enforces per-user access)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- Zero out gamification stats for every user
UPDATE public.profiles
SET xp = 0,
    level = 1,
    coins = 0,
    streak = 0,
    last_study_date = NULL,
    updated_at = now();
