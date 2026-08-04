ALTER TABLE public.products ADD COLUMN IF NOT EXISTS video_url text;

CREATE TABLE IF NOT EXISTS public.site_media (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'image',
  url text not null,
  poster_url text,
  title text,
  subtitle text,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

GRANT SELECT ON public.site_media TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_media TO authenticated;
GRANT ALL ON public.site_media TO service_role;

ALTER TABLE public.site_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active site media" ON public.site_media FOR SELECT TO anon, authenticated USING (active OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert site media" ON public.site_media FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update site media" ON public.site_media FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete site media" ON public.site_media FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER site_media_updated_at BEFORE UPDATE ON public.site_media
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_count INT;
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));

  SELECT COUNT(*) INTO user_count FROM auth.users;
  IF lower(NEW.email) = 'zzahrayadam@gmail.com' OR user_count = 1 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users WHERE lower(email) = 'zzahrayadam@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;