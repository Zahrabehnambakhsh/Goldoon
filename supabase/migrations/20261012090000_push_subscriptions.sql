-- Web push: one row per device that turned on watering reminders.
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  notify_time time NOT NULL DEFAULT '09:00',
  timezone text NOT NULL DEFAULT 'Asia/Tehran',
  last_sent_on date,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS push_subscriptions_user_id_idx ON public.push_subscriptions (user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own push subscriptions" ON public.push_subscriptions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;

-- Server-only settings (VAPID keys, cron secret). RLS with no policies: only the service role
-- (the push-reminders edge function) and the database itself can read it.
-- Values are inserted outside of migrations so they never land in git.
CREATE TABLE IF NOT EXISTS public.app_secrets (
  name text PRIMARY KEY,
  value text NOT NULL
);
ALTER TABLE public.app_secrets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.app_secrets FROM anon, authenticated;

-- Every 15 minutes, ask the edge function to send reminders whose time has come.
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.unschedule('push-reminders')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'push-reminders');

SELECT cron.schedule(
  'push-reminders',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://oxbftgxghdeuvlbnkvbp.supabase.co/functions/v1/push-reminders',
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-cron-secret', (SELECT value FROM public.app_secrets WHERE name = 'cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
