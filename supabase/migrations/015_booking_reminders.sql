-- Suivi des rappels email J-3 / J-1

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS reminder_3d_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_1d_sent_at timestamptz;

-- Cron quotidien 07:00 UTC → Edge Function send-booking-reminders
-- Après déploiement de la function, exécuter dans le SQL Editor Supabase
-- (remplacer YOUR_SERVICE_ROLE_KEY par la clé service role du projet) :
--
-- CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
-- CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
--
-- SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'send-booking-reminders';
--
-- SELECT cron.schedule(
--   'send-booking-reminders',
--   '0 7 * * *',
--   $$
--   SELECT net.http_post(
--     url := 'https://bzjmzjdaqkdemzahvssi.supabase.co/functions/v1/send-booking-reminders',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
--     ),
--     body := '{}'::jsonb
--   ) AS request_id;
--   $$
-- );
