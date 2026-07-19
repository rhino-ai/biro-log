
-- 1. activity_log: replace ALL policy with granular ones (users may only SELECT/DELETE, no INSERT/UPDATE)
DROP POLICY IF EXISTS "Users can manage own activity" ON public.activity_log;
CREATE POLICY "Users can view own activity"
  ON public.activity_log FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own activity"
  ON public.activity_log FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
-- INSERT/UPDATE restricted to service_role only (edge functions)

-- 2. group_members: only allow self-join for public groups, else creator must add
DROP POLICY IF EXISTS "Can add members" ON public.group_members;
CREATE POLICY "Can add members"
  ON public.group_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.chat_groups g WHERE g.id = group_id AND g.created_by = auth.uid())
    OR (
      auth.uid() = user_id
      AND EXISTS (SELECT 1 FROM public.chat_groups g WHERE g.id = group_id AND g.is_public = true)
    )
  );

-- 3. profiles: revoke column-level SELECT on sensitive fields from authenticated/anon
REVOKE SELECT (email, phone) ON public.profiles FROM authenticated;
REVOKE SELECT (email, phone) ON public.profiles FROM anon;
-- Admins/service still see everything via service_role

-- 4. storage: drop broad public listing policy on chat-uploads (public URL access still works)
DROP POLICY IF EXISTS "Anyone can view chat uploads" ON storage.objects;
