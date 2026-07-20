
CREATE OR REPLACE FUNCTION public.admin_reschedule_push_cron(_secret text, _job_name text DEFAULT 'push-scheduler-every-15min')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  fn_url text;
  anon_key text;
BEGIN
  -- Only callable by service_role
  IF (auth.jwt() ->> 'role') <> 'service_role' AND current_user <> 'postgres' THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  fn_url := 'https://kmatfjfpfigzmgiotgtr.supabase.co/functions/v1/push-scheduler';
  anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttYXRmamZwZmlnem1naW90Z3RyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4MzI1MDksImV4cCI6MjA4NTQwODUwOX0.Ef29XNIJ29zibPUOlwxaszPw6u63QC6oqzTVDvCAzfY';

  -- Unschedule anything with the same job name (ignore errors)
  BEGIN
    PERFORM cron.unschedule(_job_name);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  PERFORM cron.schedule(
    _job_name,
    '*/15 * * * *',
    format(
      $q$select net.http_post(
        url:=%L,
        headers:=jsonb_build_object(
          'Content-Type','application/json',
          'apikey', %L,
          'Authorization', 'Bearer ' || %L,
          'x-cron-secret', %L
        ),
        body:=jsonb_build_object('scheduled_at', now())
      );$q$,
      fn_url, anon_key, anon_key, _secret
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_reschedule_push_cron(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_reschedule_push_cron(text, text) TO service_role;
