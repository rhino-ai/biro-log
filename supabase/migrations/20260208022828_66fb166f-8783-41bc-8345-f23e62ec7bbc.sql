
-- 1. Add UPDATE policy for direct_messages (read receipts)
CREATE POLICY "Receivers can mark messages as read"
ON public.direct_messages
FOR UPDATE
USING (auth.uid() = receiver_id)
WITH CHECK (auth.uid() = receiver_id);

-- 2. Restrict profiles SELECT to own profile + contacts only
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can view contact profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.contacts
    WHERE contacts.user_id = auth.uid()
    AND contacts.contact_user_id = profiles.user_id
  )
);

-- 3. Allow users to see profiles of people in their chat groups
CREATE POLICY "Users can view group member profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.group_members gm1
    JOIN public.group_members gm2 ON gm1.group_id = gm2.group_id
    WHERE gm1.user_id = auth.uid()
    AND gm2.user_id = profiles.user_id
  )
);
