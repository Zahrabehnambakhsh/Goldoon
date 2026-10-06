-- What the app calls the user ("سلام، …"). NULL means they haven't chosen yet,
-- so the app asks once right after their first login.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name text;
