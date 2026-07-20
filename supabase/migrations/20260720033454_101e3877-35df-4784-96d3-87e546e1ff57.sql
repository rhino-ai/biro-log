-- app_comments: restrict SELECT to owner + admins
DROP POLICY IF EXISTS "Authed read all comments" ON public.app_comments;
CREATE POLICY "Users read own comments or admins read all"
ON public.app_comments
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

-- feature_ratings: restrict SELECT to owner + admins
DROP POLICY IF EXISTS "All authed can read ratings" ON public.feature_ratings;
CREATE POLICY "Users read own ratings or admins read all"
ON public.feature_ratings
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));