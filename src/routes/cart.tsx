import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Plus, Trash2 } from "lucide-react";
import { cartTotals, formatMoney, useCart } from "@/lib/cart-store";

export const Route = createFileRoute("/cart")({
  component: CartPage,
});

function CartPage() {
  const { items, setQty, remove } = useCart();
  const { count, subtotalCents, currency } = cartTotals(items);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="font-display text-4xl">Your cart</h1>
      <p className="text-[var(--muted-foreground)] mt-2">
        {count > 0 ? `${count} item${count > 1 ? "s" : ""} ready to bake` : "Nothing here yet"}
      </p>

      {items.length === 0 ? (
        <div className="card-soft mt-10 py-16 text-center">
          <div className="text-5xl mb-4">🍪</div>
          <p className="text-[var(--muted-foreground)]">Your cart is empty.</p>
          <Link to="/" className="btn-primary mt-6 inline-flex">Browse treats</Link>
        </div>
      ) : (
        <div className="mt-10 grid gap-10 md:grid-cols-[1fr_320px]">
          <div className="flex flex-col gap-4">
            {items.map((i) => (
              <div key={i.productId} className="card-soft p-4 flex gap-4 items-center">
                <div className="w-20 h-20 rounded-lg overflow-hidden bg-[var(--muted)] flex-shrink-0">
                  {i.imageUrl ? (
                    <img src={i.imageUrl} alt={i.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">🧁</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <Link to="/product/$id" params={{ id: i.productId }} className="font-display text-lg hover:text-[var(--primary)]">
                    {i.name}
                  </Link>
                  <div className="text-sm text-[var(--muted-foreground)]">
                    {formatMoney(i.priceCents, i.currency)} each
                  </div>
                </div>
                <div className="flex items-center gap-1 border border-[var(--border)] rounded-full">
                  <button onClick={() => setQty(i.productId, i.quantity - 1)} className="p-2 hover:text-[var(--primary)]" aria-label="Decrease">
                    <Minus size={14} />
                  </button>
                  <span className="w-8 text-center text-sm font-semibold">{i.quantity}</span>
                  <button onClick={() => setQty(i.productId, i.quantity + 1)} disabled={i.quantity >= i.maxStock} className="p-2 hover:text-[var(--primary)] disabled:opacity-40" aria-label="Increase">
                    <Plus size={14} />
                  </button>
                </div>
                <div className="w-20 text-right font-semibold hidden sm:block">
                  {formatMoney(i.priceCents * i.quantity, i.currency)}
                </div>
                <button onClick={() => remove(i.productId)} className="p-2 text-[var(--muted-foreground)] hover:text-[var(--destructive)]" aria-label="Remove">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
          <aside className="card-soft p-6 h-fit sticky top-24">
            <h2 className="font-display text-xl mb-4">Order summary</h2>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--muted-foreground)]">Subtotal</span>
              <span className="font-semibold">{formatMoney(subtotalCents, currency)}</span>
            </div>
            <div className="flex justify-between text-sm mt-2">
              <span className="text-[var(--muted-foreground)]">Shipping</span>
              <span className="text-[var(--muted-foreground)]">Calculated at checkout</span>
            </div>
            <div className="border-t border-[var(--border)] my-4" />
            <div className="flex justify-between text-lg">
              <span className="font-display">Total</span>
              <span className="font-display font-bold">{formatMoney(subtotalCents, currency)}</span>
            </div>
            <Link to="/checkout" className="btn-primary w-full mt-6">
              Checkout
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}
