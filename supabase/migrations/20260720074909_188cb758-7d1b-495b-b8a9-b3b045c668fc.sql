
ALTER TABLE public.group_messages
  ADD COLUMN IF NOT EXISTS attachment_meta JSONB;
