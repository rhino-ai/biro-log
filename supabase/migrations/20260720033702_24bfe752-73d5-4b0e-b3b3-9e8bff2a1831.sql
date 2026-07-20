-- Tighten chat-uploads SELECT to owner only
DROP POLICY IF EXISTS "Owners can list own chat uploads" ON storage.objects;
DROP POLICY IF EXISTS "Chat uploads readable by authed" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read chat uploads" ON storage.objects;
CREATE POLICY "Owners can read own chat uploads"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-uploads'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Ensure app_comments SELECT is owner-or-admin (idempotent re-apply for scanner)
DROP POLICY IF EXISTS "Authed read all comments" ON public.app_comments;
DROP POLICY IF EXISTS "Users read own comments or admins read all" ON public.app_comments;
CREATE POLICY "Users read own comments or admins read all"
ON public.app_comments
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

-- Ensure feature_ratings SELECT is owner-or-admin
DROP POLICY IF EXISTS "All authed can read ratings" ON public.feature_ratings;
DROP POLICY IF EXISTS "Users read own ratings or admins read all" ON public.feature_ratings;
CREATE POLICY "Users read own ratings or admins read all"
ON public.feature_ratings
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));