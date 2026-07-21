-- Speed up task reminder pushes: run scheduler every minute instead of every 15 min.
-- Also drop the duplicate 15-min job.
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN SELECT jobid, jobname FROM cron.job WHERE jobname IN ('push-scheduler-15m','push-scheduler-every-15min','push-scheduler-1m') LOOP
    PERFORM cron.unschedule(rec.jobid);
  END LOOP;
END $$;

SELECT cron.schedule(
  'push-scheduler-1m',
  '* * * * *',
  $$
  SELECT net.http_post(
    url:='https://kmatfjfpfigzmgiotgtr.supabase.co/functions/v1/push-scheduler',
    headers:=jsonb_build_object(
      'Content-Type','application/json',
      'x-cron-secret', current_setting('app.cron_secret', true)
    ),
    body:='{}'::jsonb
  ) AS request_id;
  $$
);