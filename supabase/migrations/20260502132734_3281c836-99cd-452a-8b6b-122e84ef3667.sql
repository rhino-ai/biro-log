
-- ============ STORAGE: restrict listing to owner ============
-- avatars bucket
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Public can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read avatars" ON storage.objects;

-- Public READ of avatar files by direct URL is fine (bucket is public),
-- but listing should be restricted. Replace any broad SELECT policies with owner-only listing.
CREATE POLICY "Owners can list own avatars"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'avatars'
  AND (auth.uid()::text = (storage.foldername(name))[1])
);

CREATE POLICY "Owners can list own chat uploads"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'chat-uploads'
  AND (auth.uid()::text = (storage.foldername(name))[1])
);

-- ============ FUNCTION EXECUTE PERMISSIONS ============
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ensure_profile_codes() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_and_assign_first_admin() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_unique_code(text, integer) FROM PUBLIC, anon, authenticated;

-- has_role / verify_admin_step_codes are intentionally callable by signed-in users (used in app)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.verify_admin_step_codes(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.verify_admin_step_codes(text, text) TO authenticated;

-- ============ NEW TABLES ============

-- 1. Daily Journal entries
CREATE TABLE IF NOT EXISTS public.journal_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  mood INTEGER,
  prompt TEXT,
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_journal_user_date ON public.journal_entries(user_id, entry_date DESC);
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own journal" ON public.journal_entries FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_journal_updated BEFORE UPDATE ON public.journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Custom trackers (sheets)
CREATE TABLE IF NOT EXISTS public.tracker_sheets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '📊',
  color TEXT DEFAULT 'blue',
  columns JSONB NOT NULL DEFAULT '[]'::jsonb,
  rows JSONB NOT NULL DEFAULT '[]'::jsonb,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tracker_user_pos ON public.tracker_sheets(user_id, position);
ALTER TABLE public.tracker_sheets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own trackers" ON public.tracker_sheets FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_tracker_updated BEFORE UPDATE ON public.tracker_sheets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Feature ratings (5-star)
CREATE TABLE IF NOT EXISTS public.feature_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  feature_key TEXT NOT NULL,
  stars INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, feature_key)
);
ALTER TABLE public.feature_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own ratings" ON public.feature_ratings FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "All authed can read ratings" ON public.feature_ratings FOR SELECT
  TO authenticated USING (true);
CREATE TRIGGER trg_feat_rating_updated BEFORE UPDATE ON public.feature_ratings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Public app comments / corrections
CREATE TABLE IF NOT EXISTS public.app_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category TEXT NOT NULL DEFAULT 'feedback',
  content TEXT NOT NULL,
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_comments_created ON public.app_comments(created_at DESC);
ALTER TABLE public.app_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users insert own comments" ON public.app_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Authed read all comments" ON public.app_comments FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "Users delete own comments" ON public.app_comments FOR DELETE
  USING (auth.uid() = user_id);
CREATE POLICY "Admins manage comments" ON public.app_comments FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
