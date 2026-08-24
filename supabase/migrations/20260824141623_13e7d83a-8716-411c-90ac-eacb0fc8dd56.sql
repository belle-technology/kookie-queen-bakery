ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS admin_note text,
  ADD COLUMN IF NOT EXISTS admin_note_updated_at timestamp with time zone;

CREATE OR REPLACE FUNCTION public.tg_orders_admin_note_stamp()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF coalesce(NEW.admin_note,'') <> coalesce(OLD.admin_note,'') THEN
    NEW.admin_note_updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_admin_note_stamp ON public.orders;
CREATE TRIGGER orders_admin_note_stamp
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.tg_orders_admin_note_stamp();

DROP FUNCTION IF EXISTS public.get_order_status(text, text);

CREATE OR REPLACE FUNCTION public.get_order_status(p_tracking_code text, p_email text)
RETURNS TABLE(tracking_code text, customer_name text, status order_status, total_cents integer, currency text, payment_confirmed_at timestamp with time zone, created_at timestamp with time zone, admin_note text, admin_note_updated_at timestamp with time zone, items jsonb)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT o.tracking_code, o.customer_name, o.status, o.total_cents, o.currency,
         o.payment_confirmed_at, o.created_at, o.admin_note, o.admin_note_updated_at,
         coalesce((SELECT jsonb_agg(jsonb_build_object('name', oi.product_name, 'quantity', oi.quantity, 'unit_price_cents', oi.unit_price_cents))
                   FROM public.order_items oi WHERE oi.order_id = o.id), '[]'::jsonb)
  FROM public.orders o
  WHERE upper(btrim(o.tracking_code)) = upper(btrim(p_tracking_code))
    AND lower(o.customer_email) = lower(btrim(p_email))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_order_status(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_order_status(text, text) TO anon, authenticated, service_role;