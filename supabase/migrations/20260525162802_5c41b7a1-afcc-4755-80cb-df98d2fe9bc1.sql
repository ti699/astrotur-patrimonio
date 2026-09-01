
-- Enum de roles
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tabela profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL DEFAULT '',
  email text NOT NULL,
  cargo text,
  setor text,
  role public.app_role NOT NULL DEFAULT 'user',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Função has_role (security definer, evita recursão)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = _user_id AND role = _role);
$$;

-- RLS policies profiles
DROP POLICY IF EXISTS "read profiles" ON public.profiles;
CREATE POLICY "read profiles" ON public.profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "insert own profile" ON public.profiles;
CREATE POLICY "insert own profile" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "update own or admin" ON public.profiles;
CREATE POLICY "update own or admin" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "delete admin only" ON public.profiles;
CREATE POLICY "delete admin only" ON public.profiles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger criar profile no signup
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
      WHEN NEW.email = 'admin@astrotur.com' THEN 'admin'::public.app_role
      WHEN COALESCE(NEW.raw_user_meta_data->>'role','user') = 'admin' THEN 'admin'::public.app_role
      ELSE 'user'::public.app_role
    END
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Tabela de configurações do sistema (singleton)
CREATE TABLE IF NOT EXISTS public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL DEFAULT 'Astrotur',
  cnpj text,
  email text,
  phone text,
  address text,
  logo_url text,
  primary_color text NOT NULL DEFAULT '#C0392B',
  patrimonio_prefix text NOT NULL DEFAULT 'AST',
  currency text NOT NULL DEFAULT 'R$',
  items_per_page integer NOT NULL DEFAULT 20,
  dark_mode boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read settings" ON public.app_settings;
CREATE POLICY "read settings" ON public.app_settings FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "admin update settings" ON public.app_settings;
CREATE POLICY "admin update settings" ON public.app_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admin insert settings" ON public.app_settings;
CREATE POLICY "admin insert settings" ON public.app_settings FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.app_settings (company_name, primary_color, patrimonio_prefix, currency, items_per_page)
SELECT 'Astrotur', '#C0392B', 'AST', 'R$', 20
WHERE NOT EXISTS (SELECT 1 FROM public.app_settings);

-- Backfill profiles para usuários já existentes
INSERT INTO public.profiles (user_id, email, role)
SELECT u.id, u.email,
  CASE WHEN u.email = 'admin@astrotur.com' THEN 'admin'::public.app_role ELSE 'user'::public.app_role END
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = u.id);

-- Trigger updated_at em profiles e settings
DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS app_settings_updated_at ON public.app_settings;
CREATE TRIGGER app_settings_updated_at BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
