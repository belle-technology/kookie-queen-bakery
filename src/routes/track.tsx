import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/lib/cart-store";

type Search = { code?: string; email?: string };

export const Route = createFileRoute("/track")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    code: typeof search['code'] === "string" ? search['code'] : undefined,
    email: typeof search['email'] === "string" ? search['email'] : undefined,
  }),
  component: TrackPage,
  head: () => ({
    meta: [
      { title: "Track your Kookie Queen pre-order" },
      { name: "description", content: "Check your Kookie Queen pre-order: payment confirmation and Sunday delivery status, using your tracking code and email." },
      { property: "og:title", content: "Track your Kookie Queen pre-order" },
      { property: "og:description", content: "Check payment confirmation and Sunday delivery status for your cookie pre-order." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type OrderStatus = {
  tracking_code: string;
  customer_name: string;
  status: string;
  total_cents: number;
  currency: string;
  payment_confirmed_at: string | null;
  created_at: string;
  admin_note: string | null;
  admin_note_updated_at: string | null;
  items: { name: string; quantity: number; unit_price_cents: number }[];
};

const STEPS: Record<string, { label: string; blurb: string }> = {
  pending: {
    label: "Awaiting payment confirmation",
    blurb: "We've received your pre-order. Once we confirm your bank transfer, this page will update.",
  },
  paid: {
    label: "Payment confirmed — your order is placed for Sunday",
    blurb: "Your payment has been confirmed and your order is locked in for Sunday delivery.",
  },
  fulfilled: {
    label: "Delivered",
    blurb: "Your cookies have been delivered. Thank you for ordering from Kookie Queen!",
  },
  cancelled: {
    label: "Cancelled",
    blurb: "This order was cancelled. Please reach out if you think that's a mistake.",
  },
};


function TrackPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [code, setCode] = useState(search.code ?? "");
  const [email, setEmail] = useState(search.email ?? "");
  const [order, setOrder] = useState<OrderStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function lookup(c: string, e: string) {
    if (!c.trim() || !e.trim()) return;
    setLoading(true);
    setError(null);
    const { data, error: rpcError } = await supabase.rpc("get_order_status", {
      p_tracking_code: c.trim(),
      p_email: e.trim(),
    });
    setLoading(false);
    if (rpcError) {
      setError(rpcError.message);
      setOrder(null);
      return;
    }
    const row = (data as unknown as OrderStatus[])?.[0];
    if (!row) {
      setOrder(null);
      setError("We couldn't find an order with that code and email.");
      return;
    }
    setOrder(row);
  }

  useEffect(() => {
    if (search.code && search.email) void lookup(search.code, search.email);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.code, search.email]);

  const step = order ? (STEPS[order.status] ?? STEPS['pending']!) : null;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="font-display text-4xl">Track your pre-order</h1>
      <p className="text-[var(--muted-foreground)] mt-2">
        Enter the tracking code from your confirmation and the email you ordered with.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          navigate({ to: "/track", search: { code: code.trim(), email: email.trim() } });
          void lookup(code, email);
        }}
        className="card-soft p-6 mt-8 flex flex-col gap-4"
      >
        <div>
          <label className="text-sm font-semibold">Tracking code</label>
          <input required value={code} onChange={(e) => setCode(e.target.value)} className="input-field mt-1 uppercase" placeholder="e.g. 7F2A9B1C" />
        </div>
        <div>
          <label className="text-sm font-semibold">Email</label>
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field mt-1" />
        </div>
        <button disabled={loading} className="btn-primary disabled:opacity-50">
          {loading ? "Checking…" : "Check my order"}
        </button>
      </form>

      {error && <p className="mt-6 text-sm text-[var(--destructive)]">{error}</p>}

      {order && step && (
        <div className="card-soft p-6 mt-8">
          <div className="text-xs uppercase tracking-widest text-[var(--muted-foreground)]">
            Order {order.tracking_code}
          </div>
          <h2 className="font-display text-2xl mt-1">{step.label}</h2>
          <p className="text-sm text-[var(--muted-foreground)] mt-2">{step.blurb}</p>

          <div className="mt-5 flex flex-wrap gap-2 text-xs">
            <span className={`chip ${order.payment_confirmed_at ? "bg-[var(--accent)] text-[var(--ink)]" : "bg-[var(--secondary)] text-[var(--secondary-foreground)]"}`}>
              {order.payment_confirmed_at ? "Payment confirmed" : "Payment pending"}
            </span>
            <span className="chip bg-[var(--secondary)] text-[var(--secondary-foreground)]">
              {order.status === "fulfilled" ? "Delivered" : "Delivers Sunday"}
            </span>
          </div>

          <div className="border-t border-[var(--border)] my-5" />
          <div className="flex flex-col gap-2 text-sm">
            {order.items.map((i, idx) => (
              <div key={idx} className="flex gap-3">
                <span className="font-semibold">{i.quantity}×</span>
                <span className="flex-1">{i.name}</span>
                <span>{formatMoney(i.unit_price_cents * i.quantity, order.currency)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-[var(--border)] my-4" />
          <div className="flex justify-between font-display text-lg">
            <span>Total</span>
            <span className="font-bold">{formatMoney(order.total_cents, order.currency)}</span>
          </div>

          {!order.payment_confirmed_at && order.status !== "cancelled" && (
            <p className="mt-4 text-xs text-[var(--muted-foreground)]">
              Transfer to GTBank 1034579657 · Fatima Adam Yusuf, using {order.tracking_code} as the reference.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
