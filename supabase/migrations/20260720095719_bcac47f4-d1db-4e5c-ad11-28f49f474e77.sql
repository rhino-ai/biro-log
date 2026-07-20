
-- 1. Contacts: mutual-consent status
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';
UPDATE public.contacts SET status = 'accepted' WHERE status = 'pending';
ALTER TABLE public.contacts DROP CONSTRAINT IF EXISTS contacts_status_check;
ALTER TABLE public.contacts ADD CONSTRAINT contacts_status_check CHECK (status IN ('pending','accepted','blocked'));

DROP POLICY IF EXISTS "Users can add contacts" ON public.contacts;
CREATE POLICY "Users can add contacts" ON public.contacts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id AND status = 'pending');

DROP POLICY IF EXISTS "Users can view own contacts" ON public.contacts;
CREATE POLICY "Users can view related contacts" ON public.contacts FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR auth.uid() = contact_user_id);

DROP POLICY IF EXISTS "Users can update contacts" ON public.contacts;
CREATE POLICY "Adder can update own contact row" ON public.contacts FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Target can accept or block incoming" ON public.contacts FOR UPDATE
  TO authenticated USING (auth.uid() = contact_user_id)
  WITH CHECK (auth.uid() = contact_user_id AND status IN ('accepted','blocked'));

-- 2. Profiles: gate contact-based visibility on mutual acceptance
DROP POLICY IF EXISTS "Contact profile select" ON public.profiles;
CREATE POLICY "Accepted contact profile select" ON public.profiles FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.contacts a
      JOIN public.contacts b
        ON b.user_id = a.contact_user_id AND b.contact_user_id = a.user_id
      WHERE a.user_id = auth.uid()
        AND a.contact_user_id = profiles.user_id
        AND a.status = 'accepted'
        AND b.status = 'accepted'
    )
  );

-- 3. Column-level: hide email and phone from other users
REVOKE SELECT (email, phone) ON public.profiles FROM authenticated;
REVOKE SELECT (email, phone) ON public.profiles FROM anon;
