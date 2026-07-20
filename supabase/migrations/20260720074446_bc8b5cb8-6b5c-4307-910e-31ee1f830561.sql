
CREATE TABLE IF NOT EXISTS public.user_public_keys (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  public_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_public_keys TO authenticated;
GRANT ALL ON public.user_public_keys TO service_role;

ALTER TABLE public.user_public_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public keys readable by authenticated"
  ON public.user_public_keys FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users manage their own public key"
  ON public.user_public_keys FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update their own public key"
  ON public.user_public_keys FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete their own public key"
  ON public.user_public_keys FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_user_public_keys_updated_at
  BEFORE UPDATE ON public.user_public_keys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.direct_messages
  ADD COLUMN IF NOT EXISTS encrypted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS nonce TEXT,
  ADD COLUMN IF NOT EXISTS attachment_meta JSONB;
