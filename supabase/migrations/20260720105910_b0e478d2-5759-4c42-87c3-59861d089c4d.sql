-- Host action audit log for study rooms
CREATE TABLE IF NOT EXISTS public.study_room_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.study_rooms(id) ON DELETE CASCADE,
  host_id uuid NOT NULL,
  action text NOT NULL,
  target_id text,
  target_name text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.study_room_audit_log TO authenticated;
GRANT ALL ON public.study_room_audit_log TO service_role;

ALTER TABLE public.study_room_audit_log ENABLE ROW LEVEL SECURITY;

-- Host can view their own room audit entries
CREATE POLICY "Host can view own room audit"
  ON public.study_room_audit_log
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = host_id
    OR EXISTS (
      SELECT 1 FROM public.study_rooms r
      WHERE r.id = study_room_audit_log.room_id AND r.owner_id = auth.uid()
    )
  );

-- Host can log their own actions on rooms they own
CREATE POLICY "Host can insert audit for own rooms"
  ON public.study_room_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = host_id
    AND EXISTS (
      SELECT 1 FROM public.study_rooms r
      WHERE r.id = study_room_audit_log.room_id AND r.owner_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS study_room_audit_log_room_idx ON public.study_room_audit_log(room_id, created_at DESC);