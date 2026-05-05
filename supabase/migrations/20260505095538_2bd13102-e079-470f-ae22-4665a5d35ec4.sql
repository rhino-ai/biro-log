
CREATE TABLE IF NOT EXISTS public.chat_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  tone TEXT NOT NULL DEFAULT 'respectful_friendly',
  reply_length TEXT NOT NULL DEFAULT 'balanced',
  persona TEXT NOT NULL DEFAULT 'auto',
  custom_instructions TEXT DEFAULT '',
  show_thinking BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view own prefs" ON public.chat_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "insert own prefs" ON public.chat_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update own prefs" ON public.chat_preferences FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "delete own prefs" ON public.chat_preferences FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_chat_prefs_updated_at
BEFORE UPDATE ON public.chat_preferences
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.mentor_conversations
  ADD COLUMN IF NOT EXISTS attachment_meta JSONB;
