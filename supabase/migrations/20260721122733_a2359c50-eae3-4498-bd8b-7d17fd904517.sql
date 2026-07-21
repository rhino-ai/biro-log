
ALTER TABLE public.user_tasks 
  ADD COLUMN IF NOT EXISTS remind_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reminded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE INDEX IF NOT EXISTS idx_user_tasks_remind_at ON public.user_tasks(remind_at) WHERE remind_at IS NOT NULL AND reminded_at IS NULL;

ALTER TABLE public.chat_preferences ADD COLUMN IF NOT EXISTS viewing_chat_id TEXT;
ALTER TABLE public.push_subscriptions ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;
