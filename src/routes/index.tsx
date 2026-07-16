import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard, type ProductCardData } from "@/components/site/ProductCard";
import heroImage from "@/assets/hero-bakes.jpg";

export const Route = createFileRoute("/")({
  component: Home,
});

async function fetchProducts(): Promise<ProductCardData[]> {
  const { data: products, error } = await supabase
    .from("products")
    .select("id, name, description, price_cents, currency, image_url, stock, status")
    .neq("status", "draft")
    .order("created_at", { ascending: false });
  if (error) throw error;

  const { data: ratings } = await supabase.from("ratings").select("product_id, stars");
  const map = new Map<string, { total: number; count: number }>();
  ratings?.forEach((r) => {
    const cur = map.get(r.product_id) ?? { total: 0, count: 0 };
    cur.total += r.stars;
    cur.count += 1;
    map.set(r.product_id, cur);
  });
  return (products ?? []).map((p) => {
    const r = map.get(p.id);
    return {
      ...p,
      avg_rating: r ? r.total / r.count : 0,
      rating_count: r?.count ?? 0,
    } as ProductCardData;
  });
}

function Home() {
  const { data: products, isLoading } = useQuery({
    queryKey: ["products", "public"],
    queryFn: fetchProducts,
  });

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-[var(--ink)] text-[var(--cream)]">
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt=""
            width={1600}
            height={1000}
            className="w-full h-full object-cover opacity-70"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--ink)] via-[var(--ink)]/70 to-transparent" />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
          <span className="chip bg-[var(--accent)] text-[var(--accent-foreground)]">
            Freshly baked
          </span>
          <h1 className="mt-4 font-display text-5xl sm:text-6xl md:text-7xl leading-[1.05] max-w-2xl">
            Cookies, cakes &<br />
            <span className="text-[var(--accent)]">everything sweet.</span>
          </h1>
          <p className="mt-5 max-w-md text-[var(--cream)]/80 text-lg">
            Small-batch bakes, handmade with real butter and a whole lot of love. Order today — we bake tomorrow.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#shop" className="btn-pink">Shop the treats</a>
            <a href="#story" className="btn-ghost text-[var(--cream)]">Our story →</a>
          </div>
        </div>
      </section>

      {/* Products */}
      <section id="shop" className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="flex items-end justify-between gap-4 mb-8">
          <div>
            <span className="chip bg-[var(--secondary)] text-[var(--secondary-foreground)]">This week's menu</span>
            <h2 className="mt-3 font-display text-3xl sm:text-4xl">The treat case</h2>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card-soft aspect-[4/5] animate-pulse bg-[var(--muted)]" />
            ))}
          </div>
        ) : products && products.length > 0 ? (
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <div className="card-soft py-20 text-center">
            <div className="text-5xl mb-4">🧁</div>
            <h3 className="font-display text-2xl">The oven is warming up</h3>
            <p className="mt-2 text-[var(--muted-foreground)] max-w-md mx-auto">
              No treats yet — sign in as the owner to add your first cookie or cake.
            </p>
          </div>
        )}
      </section>

      {/* Story */}
      <section id="story" className="bg-[var(--secondary)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 grid gap-12 md:grid-cols-2 items-center">
          <div>
            <span className="chip bg-[var(--ink)] text-[var(--cream)]">Our story</span>
            <h2 className="mt-4 font-display text-4xl sm:text-5xl leading-tight">
              Every bake starts in our tiny, flour-dusted kitchen.
            </h2>
            <p className="mt-5 text-[var(--secondary-foreground)]/80 text-lg">
              Kookie Queen is a one-baker operation with big dreams and even bigger cookies. Everything is made to order, so you get it fresh — not from a shelf.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { k: "100%", v: "Real butter" },
              { k: "0", v: "Preservatives" },
              { k: "24h", v: "Fresh guarantee" },
              { k: "∞", v: "Sweet cravings" },
            ].map((s) => (
              <div key={s.v} className="bg-white rounded-2xl p-6 text-center">
                <div className="font-display text-4xl text-[var(--primary)]">{s.k}</div>
                <div className="mt-1 text-sm text-[var(--muted-foreground)]">{s.v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
