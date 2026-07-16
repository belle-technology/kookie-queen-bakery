import { Link } from "@tanstack/react-router";
import { ShoppingBag } from "lucide-react";
import { StarRating } from "./StarRating";
import { formatMoney, useCart } from "@/lib/cart-store";

export interface ProductCardData {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  currency: string;
  image_url: string | null;
  stock: number;
  status: "active" | "sold_out" | "draft";
  avg_rating?: number;
  rating_count?: number;
}

export function ProductCard({ product }: { product: ProductCardData }) {
  const add = useCart((s) => s.add);
  const soldOut = product.status === "sold_out" || product.stock <= 0;

  return (
    <article className="group card-soft overflow-hidden flex flex-col">
      <Link
        to="/product/$id"
        params={{ id: product.id }}
        className="relative block aspect-square overflow-hidden bg-[var(--muted)]"
      >
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[var(--muted-foreground)] font-display text-4xl">
            🍰
          </div>
        )}
        {soldOut && (
          <div className="absolute top-3 left-3 chip bg-[var(--ink)] text-[var(--cream)]">
            Sold out
          </div>
        )}
        {!soldOut && product.stock <= 3 && (
          <div className="absolute top-3 left-3 chip bg-[var(--accent)] text-[var(--accent-foreground)]">
            Only {product.stock} left
          </div>
        )}
      </Link>
      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="flex items-start justify-between gap-2">
          <Link
            to="/product/$id"
            params={{ id: product.id }}
            className="font-display text-lg leading-tight hover:text-[var(--primary)] transition-colors"
          >
            {product.name}
          </Link>
          <span className="font-semibold whitespace-nowrap">
            {formatMoney(product.price_cents, product.currency)}
          </span>
        </div>
        {product.description && (
          <p className="text-sm text-[var(--muted-foreground)] line-clamp-2">{product.description}</p>
        )}
        <div className="flex items-center gap-2 mt-1">
          <StarRating value={product.avg_rating ?? 0} size={14} />
          <span className="text-xs text-[var(--muted-foreground)]">
            {product.rating_count ? `(${product.rating_count})` : "No reviews"}
          </span>
        </div>
        <button
          type="button"
          disabled={soldOut}
          onClick={() =>
            add({
              productId: product.id,
              name: product.name,
              priceCents: product.price_cents,
              currency: product.currency,
              imageUrl: product.image_url,
              maxStock: product.stock,
            })
          }
          className="btn-primary mt-3 text-sm"
        >
          <ShoppingBag size={16} />
          {soldOut ? "Sold out" : "Add to cart"}
        </button>
      </div>
    </article>
  );
}
