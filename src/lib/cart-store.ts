import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface CartLine {
  productId: string;
  name: string;
  priceCents: number;
  currency: string;
  imageUrl: string | null;
  quantity: number;
  maxStock: number;
}

interface CartState {
  items: CartLine[];
  add: (line: Omit<CartLine, "quantity"> & { quantity?: number }) => void;
  remove: (productId: string) => void;
  setQty: (productId: string, quantity: number) => void;
  clear: () => void;
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      add: (line) =>
        set((state) => {
          const existing = state.items.find((i) => i.productId === line.productId);
          const qty = line.quantity ?? 1;
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productId === line.productId
                  ? { ...i, quantity: Math.min(i.maxStock, i.quantity + qty) }
                  : i,
              ),
            };
          }
          return {
            items: [...state.items, { ...line, quantity: Math.min(line.maxStock, qty) }],
          };
        }),
      remove: (productId) =>
        set((state) => ({ items: state.items.filter((i) => i.productId !== productId) })),
      setQty: (productId, quantity) =>
        set((state) => ({
          items: state.items
            .map((i) =>
              i.productId === productId
                ? { ...i, quantity: Math.max(0, Math.min(i.maxStock, quantity)) }
                : i,
            )
            .filter((i) => i.quantity > 0),
        })),
      clear: () => set({ items: [] }),
    }),
    {
      name: "kookie-queen-cart",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export function cartTotals(items: CartLine[]) {
  const count = items.reduce((s, i) => s + i.quantity, 0);
  const subtotalCents = items.reduce((s, i) => s + i.quantity * i.priceCents, 0);
  const currency = items[0]?.currency ?? "USD";
  return { count, subtotalCents, currency };
}

export function formatMoney(cents: number, currency = "USD") {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(cents / 100);
}
