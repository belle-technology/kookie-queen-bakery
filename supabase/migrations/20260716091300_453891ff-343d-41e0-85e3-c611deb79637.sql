
-- Fix search_path on trigger function
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- Revoke public execute on SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Tighten order INSERT policies (replace USING true with sane validation)
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
CREATE POLICY "Anyone can create orders" ON public.orders FOR INSERT TO anon, authenticated
WITH CHECK (
  length(customer_name) BETWEEN 1 AND 120 AND
  customer_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' AND
  length(shipping_address) BETWEEN 3 AND 500 AND
  total_cents > 0
);

DROP POLICY IF EXISTS "Anyone can add order items" ON public.order_items;
CREATE POLICY "Anyone can add order items" ON public.order_items FOR INSERT TO anon, authenticated
WITH CHECK (
  length(product_name) BETWEEN 1 AND 200 AND
  unit_price_cents >= 0 AND
  quantity > 0 AND quantity <= 999
);
