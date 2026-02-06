
-- Add email/phone to profiles for contact search
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Allow users to search other profiles (for adding friends)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);

-- Contacts table
CREATE TABLE public.contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  contact_user_id UUID NOT NULL,
  nickname TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, contact_user_id)
);
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own contacts" ON public.contacts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can add contacts" ON public.contacts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete contacts" ON public.contacts FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can update contacts" ON public.contacts FOR UPDATE USING (auth.uid() = user_id);

-- Direct Messages
CREATE TABLE public.direct_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE
);
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their messages" ON public.direct_messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can send messages" ON public.direct_messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users can delete own messages" ON public.direct_messages FOR DELETE USING (auth.uid() = sender_id);

-- Chat Groups
CREATE TABLE public.chat_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '📚',
  is_public BOOLEAN DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_groups ENABLE ROW LEVEL SECURITY;

-- Group Members (create BEFORE group policies that reference it)
CREATE TABLE public.group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.chat_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- Group Messages
CREATE TABLE public.group_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.chat_groups(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;

-- NOW add policies that reference group_members
CREATE POLICY "Members can view groups" ON public.chat_groups FOR SELECT USING (
  is_public = true OR EXISTS (SELECT 1 FROM public.group_members WHERE group_id = chat_groups.id AND user_id = auth.uid())
);
CREATE POLICY "Users can create groups" ON public.chat_groups FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Creators can update groups" ON public.chat_groups FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Creators can delete groups" ON public.chat_groups FOR DELETE USING (auth.uid() = created_by);

CREATE POLICY "Members can view membership" ON public.group_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid())
);
CREATE POLICY "Can add members" ON public.group_members FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.chat_groups WHERE id = group_id AND created_by = auth.uid()) OR auth.uid() = user_id
);
CREATE POLICY "Users can leave groups" ON public.group_members FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Members can view group messages" ON public.group_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.group_members WHERE group_id = group_messages.group_id AND user_id = auth.uid())
);
CREATE POLICY "Members can send group messages" ON public.group_messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND EXISTS (SELECT 1 FROM public.group_members WHERE group_id = group_messages.group_id AND user_id = auth.uid())
);
CREATE POLICY "Users can delete own group messages" ON public.group_messages FOR DELETE USING (auth.uid() = sender_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_messages;

-- Update handle_new_user to store email and check admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', 'Student'), NEW.email);
  
  IF NEW.email = 'rhino5328@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  END IF;
  
  RETURN NEW;
END;
$$;
