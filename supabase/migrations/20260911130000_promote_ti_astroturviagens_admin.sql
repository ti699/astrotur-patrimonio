-- Promote the company's master administrator by email.
UPDATE public.profiles
SET role = 'admin'::public.app_role,
    status = 'active'
WHERE lower(email) = 'ti@astroturviagens.com';

-- Keep this account administrative if its auth profile is created later.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, nome, cargo, setor, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nome', ''),
    NEW.raw_user_meta_data->>'cargo',
    NEW.raw_user_meta_data->>'setor',
    CASE
      WHEN lower(NEW.email) IN ('admin@astrotur.com', 'ti@astroturviagens.com') THEN 'admin'::public.app_role
      ELSE 'user'::public.app_role
    END
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Ensure an existing auth account has a profile even if its profile was missing.
INSERT INTO public.profiles (user_id, email, nome, role, status)
SELECT u.id, u.email, COALESCE(u.raw_user_meta_data->>'nome', ''), 'admin'::public.app_role, 'active'
FROM auth.users u
WHERE lower(u.email) = 'ti@astroturviagens.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.user_id = u.id
  );
