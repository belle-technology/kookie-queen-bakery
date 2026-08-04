import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ShoppingBag, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StarRating } from "@/components/site/StarRating";
import { formatMoney, useCart } from "@/lib/cart-store";

export const Route = createFileRoute("/product/$id")({
  component: ProductDetail,
});

function ProductDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const add = useCart((s) => s.add);

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: ratings } = useQuery({
    queryKey: ["ratings", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ratings")
        .select("*")
        .eq("product_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const avg = ratings && ratings.length
    ? ratings.reduce((s, r) => s + r.stars, 0) / ratings.length
    : 0;

  const [name, setName] = useState("");
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submitRating(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast.error("Please add your name");
    setSubmitting(true);
    const { error } = await supabase.from("ratings").insert({
      product_id: id,
      reviewer_name: name.trim(),
      stars,
      comment: comment.trim() || null,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Thanks for the review!");
    setName(""); setComment(""); setStars(5);
    qc.invalidateQueries({ queryKey: ["ratings", id] });
    qc.invalidateQueries({ queryKey: ["products", "public"] });
  }

  if (isLoading) {
    return <div className="max-w-6xl mx-auto px-4 py-20 text-center text-[var(--muted-foreground)]">Loading…</div>;
  }
  if (!product) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center">
        <p className="text-[var(--muted-foreground)]">This treat doesn't exist.</p>
        <Link to="/" className="btn-primary mt-6">Back to shop</Link>
      </div>
    );
  }

  const soldOut = product.status === "sold_out" || product.stock <= 0;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <Link to="/" className="btn-ghost inline-flex items-center gap-1 mb-6 text-sm">
        <ArrowLeft size={16} /> Back to shop
      </Link>

      <div className="grid gap-10 md:grid-cols-2">
        <div className="flex flex-col gap-4">
          <div className="card-soft overflow-hidden aspect-square bg-[var(--muted)]">
            {product.video_url ? (
              <video
                src={product.video_url}
                poster={product.image_url ?? undefined}
                autoPlay
                muted
                loop
                playsInline
                controls
                className="w-full h-full object-cover"
              />
            ) : product.image_url ? (
              <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-8xl">🍰</div>
            )}
          </div>
          {product.video_url && product.image_url && (
            <div className="card-soft overflow-hidden aspect-[16/9]">
              <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
            </div>
          )}
        </div>


        <div className="flex flex-col">
          {soldOut && (
            <span className="chip bg-[var(--ink)] text-[var(--cream)] w-fit mb-3">Sold out</span>
          )}
          <h1 className="font-display text-4xl sm:text-5xl leading-tight">{product.name}</h1>
          <div className="mt-3 flex items-center gap-3">
            <StarRating value={avg} />
            <span className="text-sm text-[var(--muted-foreground)]">
              {ratings?.length ? `${avg.toFixed(1)} · ${ratings.length} review${ratings.length > 1 ? "s" : ""}` : "No reviews yet"}
            </span>
          </div>
          <div className="mt-6 font-display text-3xl text-[var(--primary)]">
            {formatMoney(product.price_cents, product.currency)}
          </div>
          {product.description && (
            <p className="mt-5 text-[var(--muted-foreground)] leading-relaxed">{product.description}</p>
          )}
          <div className="mt-6 text-sm text-[var(--muted-foreground)]">
            {soldOut ? "Currently unavailable" : `${product.stock} available`}
          </div>
          <button
            disabled={soldOut}
            onClick={() => {
              add({
                productId: product.id,
                name: product.name,
                priceCents: product.price_cents,
                currency: product.currency,
                imageUrl: product.image_url,
                maxStock: product.stock,
              });
              toast.success(`${product.name} added to cart`);
            }}
            className="btn-primary mt-6 w-full sm:w-auto"
          >
            <ShoppingBag size={18} />
            {soldOut ? "Sold out" : "Add to cart"}
          </button>
        </div>
      </div>

      {/* Reviews */}
      <section className="mt-20 grid gap-10 md:grid-cols-2">
        <div>
          <h2 className="font-display text-3xl">Reviews</h2>
          <div className="mt-6 flex flex-col gap-4">
            {ratings && ratings.length > 0 ? (
              ratings.map((r) => (
                <div key={r.id} className="card-soft p-5">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{r.reviewer_name}</div>
                    <StarRating value={r.stars} size={14} />
                  </div>
                  {r.comment && <p className="mt-2 text-[var(--muted-foreground)]">{r.comment}</p>}
                  <div className="mt-2 text-xs text-[var(--muted-foreground)]">
                    {new Date(r.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-[var(--muted-foreground)]">Be the first to review this treat.</p>
            )}
          </div>
        </div>

        <div>
          <h2 className="font-display text-3xl">Leave a review</h2>
          <form onSubmit={submitRating} className="mt-6 card-soft p-6 flex flex-col gap-4">
            <div>
              <label className="text-sm font-semibold">Your name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                className="input-field mt-1"
                placeholder="Jane D."
              />
            </div>
            <div>
              <label className="text-sm font-semibold">Rating</label>
              <div className="mt-2">
                <StarRating value={stars} onChange={setStars} size={26} />
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold">Comment (optional)</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={1000}
                rows={4}
                className="input-field mt-1 resize-none"
                placeholder="How was it?"
              />
            </div>
            <button disabled={submitting} className="btn-primary">
              {submitting ? "Posting…" : "Post review"}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
