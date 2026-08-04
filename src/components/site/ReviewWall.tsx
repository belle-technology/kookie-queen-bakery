import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { StarRating } from "./StarRating";

type ReviewRow = {
  id: string;
  reviewer_name: string;
  stars: number;
  comment: string | null;
  created_at: string;
  products: { id: string; name: string } | null;
};

export function ReviewWall() {
  const [reviews, setReviews] = useState<ReviewRow[]>([]);

  useEffect(() => {
    supabase
      .from("ratings")
      .select("id, reviewer_name, stars, comment, created_at, products(id, name)")
      .not("comment", "is", null)
      .order("created_at", { ascending: false })
      .limit(6)
      .then(({ data }) => setReviews((data as unknown as ReviewRow[]) ?? []));
  }, []);

  return (
    <section id="reviews" className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
      <div className="text-center">
        <span className="chip bg-[var(--secondary)] text-[var(--secondary-foreground)]">Loved by our customers</span>
        <h2 className="mt-3 font-display text-3xl sm:text-4xl">Five-star sweetness</h2>
        <p className="mt-3 text-[var(--muted-foreground)] max-w-lg mx-auto">
          Open any treat to leave your own rating and review — we read every single one.
        </p>
      </div>

      {reviews.length > 0 ? (
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {reviews.map((r) => (
            <figure key={r.id} className="card-soft p-6 flex flex-col gap-3">
              <StarRating value={r.stars} size={16} />
              <blockquote className="text-[var(--foreground)]/85 leading-relaxed">"{r.comment}"</blockquote>
              <figcaption className="mt-auto text-sm">
                <span className="font-semibold">{r.reviewer_name}</span>
                {r.products?.name && (
                  <span className="text-[var(--muted-foreground)]"> · {r.products.name}</span>
                )}
              </figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <div className="mt-10 card-soft py-14 text-center">
          <div className="text-4xl mb-3">⭐️</div>
          <p className="text-[var(--muted-foreground)]">
            No reviews yet — be the first to rate a Kookie Queen treat.
          </p>
        </div>
      )}
    </section>
  );
}
