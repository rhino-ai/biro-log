CREATE UNIQUE INDEX IF NOT EXISTS ucp_user_jungle_chapter 
ON public.user_chapter_progress (user_id, jungle_id, chapter_id);