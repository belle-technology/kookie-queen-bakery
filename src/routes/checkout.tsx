import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cartTotals, formatMoney, useCart } from "@/lib/cart-store";
import { preorderStatus } from "@/lib/preorder";
import { PreorderBanner } from "@/components/site/PreorderBanner";

export const Route = createFileRoute("/checkout")({
  component: Checkout,
});

function Checkout() {
  const navigate = useNavigate();
  const { items, clear } = useCart();
  const { subtotalCents, currency } = cartTotals(items);

  const [form, setForm] = useState({
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    shipping_address: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0) return;
    setSubmitting(true);

    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        ...form,
        customer_phone: form.customer_phone || null,
        notes: form.notes || null,
        total_cents: subtotalCents,
        currency,
      })
      .select()
      .single();

    if (error || !order) {
      setSubmitting(false);
      toast.error(error?.message ?? "Could not place order");
      return;
    }

    const itemRows = items.map((i) => ({
      order_id: order.id,
      product_id: i.productId,
      product_name: i.name,
      unit_price_cents: i.priceCents,
      quantity: i.quantity,
    }));
    const { error: itemsError } = await supabase.from("order_items").insert(itemRows);

    setSubmitting(false);
    if (itemsError) {
      toast.error(itemsError.message);
      return;
    }

    clear();
    toast.success("Order placed! Send your transfer to GTBank 1034579657 (Fatima Adam Yusuf).");
    navigate({ to: "/", search: {} as never });
  }

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <p className="text-[var(--muted-foreground)]">Your cart is empty.</p>
        <Link to="/" className="btn-primary mt-6 inline-flex">Browse treats</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="font-display text-4xl">Checkout</h1>
      <p className="text-[var(--muted-foreground)] mt-2">Almost there — just your details.</p>

      <div className="mt-10 grid gap-10 md:grid-cols-[1fr_320px]">
        <form onSubmit={handleSubmit} className="card-soft p-6 flex flex-col gap-4">
          <div>
            <label className="text-sm font-semibold">Full name *</label>
            <input required value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} className="input-field mt-1" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-semibold">Email *</label>
              <input required type="email" value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} className="input-field mt-1" />
            </div>
            <div>
              <label className="text-sm font-semibold">Phone</label>
              <input value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} className="input-field mt-1" />
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold">Delivery address *</label>
            <textarea required rows={3} value={form.shipping_address} onChange={(e) => setForm({ ...form, shipping_address: e.target.value })} className="input-field mt-1 resize-none" />
          </div>
          <div>
            <label className="text-sm font-semibold">Notes (allergies, requests…)</label>
            <textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input-field mt-1 resize-none" />
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--secondary)] p-4 mt-2">
            <div className="text-xs uppercase tracking-widest text-[var(--muted-foreground)]">
              Pay by bank transfer
            </div>
            <div className="mt-2 text-sm leading-relaxed">
              <div><span className="font-semibold">Bank:</span> GTBank</div>
              <div><span className="font-semibold">Account number:</span> 1034579657</div>
              <div><span className="font-semibold">Account name:</span> Fatima Adam Yusuf</div>
            </div>
            <p className="mt-2 text-xs text-[var(--muted-foreground)]">
              Transfer {formatMoney(subtotalCents, currency)} and use your name as the reference, then place your order below.
            </p>
          </div>
          <button disabled={submitting} className="btn-primary mt-2">
            {submitting ? "Placing order…" : `Place order · ${formatMoney(subtotalCents, currency)}`}
          </button>
          <p className="text-xs text-[var(--muted-foreground)] text-center">
            We'll confirm your payment and get baking.
          </p>
        </form>

        <aside className="card-soft p-6 h-fit">
          <h2 className="font-display text-xl mb-4">Your order</h2>
          <div className="flex flex-col gap-3">
            {items.map((i) => (
              <div key={i.productId} className="flex gap-3 text-sm">
                <span className="font-semibold">{i.quantity}×</span>
                <span className="flex-1">{i.name}</span>
                <span>{formatMoney(i.priceCents * i.quantity, i.currency)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-[var(--border)] my-4" />
          <div className="flex justify-between font-display text-lg">
            <span>Total</span>
            <span className="font-bold">{formatMoney(subtotalCents, currency)}</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
