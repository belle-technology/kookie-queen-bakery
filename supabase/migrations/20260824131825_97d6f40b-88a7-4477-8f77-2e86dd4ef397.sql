-- Split site_media read policy so anon does not need has_role
DROP POLICY IF EXISTS "Anyone can view active site media" ON public.site_media;

CREATE POLICY "Guests view active site media"
ON public.site_media FOR SELECT TO anon
USING (active);

CREATE POLICY "Users view site media"
ON public.site_media FOR SELECT TO authenticated
USING (active OR public.has_role(auth.uid(), 'admin'::public.app_role));

-- has_role is an internal authorization helper: signed-in policy evaluation only
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- Guest checkout + order tracking remain callable by guests (validated inside the functions)
REVOKE ALL ON FUNCTION public.place_order(text, text, text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.place_order(text, text, text, text, text, jsonb) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_order_status(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_order_status(text, text) TO anon, authenticated, service_role;

-- Internal signup trigger stays private
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;