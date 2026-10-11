-- Set when a plant is watered again too soon (before half of its interval has passed).
-- The app shows the plant in red ("زیاد آب دادی") until its next watering is due.
ALTER TABLE public.plants ADD COLUMN IF NOT EXISTS overwatered_on date;
