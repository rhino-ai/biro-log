-- Create user secrets table for Gemini API Key and other sensitive data
CREATE TABLE public.user_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  gemini_api_key TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.user_secrets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own secrets" ON public.user_secrets
  FOR ALL USING (auth.uid() = user_id);

CREATE TRIGGER update_user_secrets_updated_at
  BEFORE UPDATE ON public.user_secrets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create chat_rooms table
CREATE TABLE public.chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT, -- Nullable, used for group chats
  is_group BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chat_room_participants
CREATE TABLE public.chat_room_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.chat_rooms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);

-- Create chat_messages
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.chat_rooms(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL, -- This will hold the encrypted content if E2EE is implemented client-side
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for Chat Rooms & Messages
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Users can view rooms they are participants in
CREATE POLICY "Users can view their chat rooms" ON public.chat_rooms
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.chat_room_participants 
      WHERE room_id = public.chat_rooms.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create chat rooms" ON public.chat_rooms
  FOR INSERT WITH CHECK (true);

-- Participants RLS
CREATE POLICY "Users can view participants in their rooms" ON public.chat_room_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.chat_room_participants p2 
      WHERE p2.room_id = public.chat_room_participants.room_id AND p2.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add participants to their rooms" ON public.chat_room_participants
  FOR INSERT WITH CHECK (
    user_id = auth.uid() OR -- can add self
    EXISTS ( -- can add others if already a participant
      SELECT 1 FROM public.chat_room_participants p2 
      WHERE p2.room_id = room_id AND p2.user_id = auth.uid()
    )
  );

-- Messages RLS
CREATE POLICY "Users can view messages in their rooms" ON public.chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.chat_room_participants 
      WHERE room_id = public.chat_messages.room_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages to their rooms" ON public.chat_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.chat_room_participants 
      WHERE room_id = public.chat_messages.room_id AND user_id = auth.uid()
    )
  );

-- Create daily_hot_questions table
CREATE TABLE public.daily_hot_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.daily_hot_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view hot questions" ON public.daily_hot_questions
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage hot questions" ON public.daily_hot_questions
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Create daily_hot_answers
CREATE TABLE public.daily_hot_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES public.daily_hot_questions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  is_correct BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.daily_hot_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view answers" ON public.daily_hot_answers
  FOR SELECT USING (true);

CREATE POLICY "Users can insert answers" ON public.daily_hot_answers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own answers" ON public.daily_hot_answers
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can mark answers correct" ON public.daily_hot_answers
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
