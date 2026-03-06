
-- Create chat-uploads storage bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-uploads', 'chat-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for chat-uploads bucket
CREATE POLICY "Authenticated users can upload chat files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-uploads' AND (storage.foldername(name))[1] = 'chat-uploads' AND (storage.foldername(name))[2] = auth.uid()::text);

CREATE POLICY "Anyone can view chat uploads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'chat-uploads');

CREATE POLICY "Users can delete own chat uploads"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'chat-uploads' AND (storage.foldername(name))[2] = auth.uid()::text);
