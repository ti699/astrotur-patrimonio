
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS website TEXT;
