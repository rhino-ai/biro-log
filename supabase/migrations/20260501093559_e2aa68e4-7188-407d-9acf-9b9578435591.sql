
CREATE TABLE public.mentor_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  study_track TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_mentor_conv_user_created ON public.mentor_conversations(user_id, created_at);
ALTER TABLE public.mentor_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own mentor conv" ON public.mentor_conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own mentor conv" ON public.mentor_conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own mentor conv" ON public.mentor_conversations FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE public.mentor_daily_summaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  summary_date DATE NOT NULL DEFAULT CURRENT_DATE,
  summary TEXT NOT NULL,
  metrics JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, summary_date)
);
CREATE INDEX idx_mentor_daily_user_date ON public.mentor_daily_summaries(user_id, summary_date DESC);
ALTER TABLE public.mentor_daily_summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own mentor summary" ON public.mentor_daily_summaries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own mentor summary" ON public.mentor_daily_summaries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own mentor summary" ON public.mentor_daily_summaries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own mentor summary" ON public.mentor_daily_summaries FOR DELETE USING (auth.uid() = user_id);
