-- History of every watering, so the app can show real weekly charts, totals and streaks.
CREATE TABLE IF NOT EXISTS public.watering_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plant_id UUID NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  watered_on DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS watering_logs_user_date_idx ON public.watering_logs (user_id, watered_on DESC);

ALTER TABLE public.watering_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own watering logs all" ON public.watering_logs;
CREATE POLICY "own watering logs all" ON public.watering_logs
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
