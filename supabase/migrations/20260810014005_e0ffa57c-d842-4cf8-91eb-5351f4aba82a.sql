ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS tracking_code text,
  ADD COLUMN IF NOT EXISTS payment_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_reference text;

UPDATE public.orders SET tracking_code = upper(substr(md5(id::text), 1, 8)) WHERE tracking_code IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS orders_tracking_code_key ON public.orders (tracking_code);

CREATE OR REPLACE FUNCTION public.place_order(
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_shipping_address text,
  p_notes text,
  p_items jsonb
) RETURNS TABLE (order_id uuid, tracking_code text, total_cents integer, currency text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id uuid;
  v_code text;
  v_total integer := 0;
  v_currency text := 'USD';
  v_item jsonb;
  v_product public.products%ROWTYPE;
  v_qty integer;
BEGIN
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Your cart is empty';
  END IF;

  IF btrim(coalesce(p_customer_name,'')) = '' OR length(p_customer_name) > 120 THEN
    RAISE EXCEPTION 'Please enter your full name';
  END IF;
  IF coalesce(p_customer_email,'') !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'Please enter a valid email address';
  END IF;
  IF length(btrim(coalesce(p_shipping_address,''))) < 3 THEN
    RAISE EXCEPTION 'Please enter a delivery address';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_qty := coalesce((v_item->>'quantity')::int, 0);
    IF v_qty < 1 OR v_qty > 999 THEN
      RAISE EXCEPTION 'Invalid quantity';
    END IF;
    SELECT * INTO v_product FROM public.products WHERE id = (v_item->>'product_id')::uuid;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'A product in your cart is no longer available';
    END IF;
    IF v_product.status <> 'active' THEN
      RAISE EXCEPTION '% is sold out', v_product.name;
    END IF;
    v_total := v_total + v_product.price_cents * v_qty;
    v_currency := v_product.currency;
  END LOOP;

  IF v_total <= 0 THEN
    RAISE EXCEPTION 'Order total must be greater than zero';
  END IF;

  LOOP
    v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.orders o WHERE o.tracking_code = v_code);
  END LOOP;

  INSERT INTO public.orders (customer_name, customer_email, customer_phone, shipping_address, notes, total_cents, currency, tracking_code)
  VALUES (btrim(p_customer_name), lower(btrim(p_customer_email)), nullif(btrim(coalesce(p_customer_phone,'')),''),
          btrim(p_shipping_address), nullif(btrim(coalesce(p_notes,'')),''), v_total, v_currency, v_code)
  RETURNING id INTO v_order_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    SELECT * INTO v_product FROM public.products WHERE id = (v_item->>'product_id')::uuid;
    INSERT INTO public.order_items (order_id, product_id, product_name, unit_price_cents, quantity)
    VALUES (v_order_id, v_product.id, v_product.name, v_product.price_cents, (v_item->>'quantity')::int);
  END LOOP;

  RETURN QUERY SELECT v_order_id, v_code, v_total, v_currency;
END;
$$;

REVOKE ALL ON FUNCTION public.place_order(text, text, text, text, text, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.place_order(text, text, text, text, text, jsonb) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_order_status(p_tracking_code text, p_email text)
RETURNS TABLE (
  tracking_code text,
  customer_name text,
  status public.order_status,
  total_cents integer,
  currency text,
  payment_confirmed_at timestamptz,
  created_at timestamptz,
  items jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.tracking_code, o.customer_name, o.status, o.total_cents, o.currency,
         o.payment_confirmed_at, o.created_at,
         coalesce((SELECT jsonb_agg(jsonb_build_object('name', oi.product_name, 'quantity', oi.quantity, 'unit_price_cents', oi.unit_price_cents))
                   FROM public.order_items oi WHERE oi.order_id = o.id), '[]'::jsonb)
  FROM public.orders o
  WHERE upper(btrim(o.tracking_code)) = upper(btrim(p_tracking_code))
    AND lower(o.customer_email) = lower(btrim(p_email))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_order_status(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_order_status(text, text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.tg_orders_payment_stamp()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('paid','fulfilled') AND OLD.status = 'pending' AND NEW.payment_confirmed_at IS NULL THEN
    NEW.payment_confirmed_at := now();
  END IF;
  IF NEW.status = 'pending' THEN
    NEW.payment_confirmed_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_payment_stamp ON public.orders;
CREATE TRIGGER orders_payment_stamp BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.tg_orders_payment_stamp();