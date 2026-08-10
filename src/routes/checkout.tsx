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
  const [placed, setPlaced] = useState<{ code: string; email: string; totalCents: number; currency: string } | null>(null);
  const { open: preorderOpen, reopensLabel } = preorderStatus();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0) return;
    if (!preorderOpen) {
      toast.error(`Pre-orders are closed — the form reopens ${reopensLabel}.`);
      return;
    }
    setSubmitting(true);

    const { data, error } = await supabase.rpc("place_order", {
      p_customer_name: form.customer_name,
      p_customer_email: form.customer_email,
      p_customer_phone: form.customer_phone || null,
      p_shipping_address: form.shipping_address,
      p_notes: form.notes || null,
      p_items: items.map((i) => ({ product_id: i.productId, quantity: i.quantity })),
    });

    setSubmitting(false);
    const row = (data as unknown as { tracking_code: string; total_cents: number; currency: string }[] | null)?.[0];
    if (error || !row) {
      toast.error(error?.message ?? "Could not place your pre-order");
      return;
    }

    clear();
    setPlaced({
      code: row.tracking_code,
      email: form.customer_email.trim(),
      totalCents: row.total_cents,
      currency: row.currency,
    });
    toast.success("Pre-order received! Send your transfer to confirm it.");
  }

  if (placed) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
        <h1 className="font-display text-4xl">Pre-order received 🎉</h1>
        <p className="text-[var(--muted-foreground)] mt-2">
          Your order isn't confirmed until we receive and confirm your bank transfer. You'll see it update here.
        </p>
        <div className="card-soft p-6 mt-8">
          <div className="text-xs uppercase tracking-widest text-[var(--muted-foreground)]">Your tracking code</div>
          <div className="font-display text-3xl mt-1 tracking-widest">{placed.code}</div>
          <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--secondary)] p-4 text-sm leading-relaxed">
            <div><span className="font-semibold">Bank:</span> GTBank</div>
            <div><span className="font-semibold">Account number:</span> 1034579657</div>
            <div><span className="font-semibold">Account name:</span> Fatima Adam Yusuf</div>
            <div className="mt-2">
              <span className="font-semibold">Amount:</span> {formatMoney(placed.totalCents, placed.currency)}
            </div>
            <div><span className="font-semibold">Reference:</span> {placed.code}</div>
          </div>
          <div className="flex flex-wrap gap-3 mt-6">
            <Link
              to="/track"
              search={{ code: placed.code, email: placed.email }}
              className="btn-primary"
            >
              Track my order
            </Link>
            <Link to="/" className="btn-ghost">Back to shop</Link>
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <p className="text-[var(--muted-foreground)]">Your cart is empty.</p>
        <Link to="/" className="btn-primary mt-6 inline-flex">Browse cookies</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="font-display text-4xl">Pre-order checkout</h1>
      <p className="text-[var(--muted-foreground)] mt-2">
        Pre-orders run Saturday to Wednesday — every order is delivered on Sunday.
      </p>

      <div className="mt-6">
        <PreorderBanner />
      </div>

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
          <button disabled={submitting || !preorderOpen} className="btn-primary mt-2 disabled:opacity-50 disabled:cursor-not-allowed">
            {!preorderOpen
              ? "Pre-orders closed"
              : submitting
                ? "Placing pre-order…"
                : `Place pre-order · ${formatMoney(subtotalCents, currency)}`}
          </button>
          <p className="text-xs text-[var(--muted-foreground)] text-center">
            {preorderOpen
              ? "We'll confirm your payment and bake for Sunday delivery."
              : `The order form reopens ${reopensLabel}. Your cart is saved.`}
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
