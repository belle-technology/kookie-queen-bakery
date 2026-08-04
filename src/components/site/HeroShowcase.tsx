import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import heroImage from "@/assets/hero-bakes.jpg";

export type SiteMedia = {
  id: string;
  kind: string;
  url: string;
  poster_url: string | null;
  title: string | null;
  subtitle: string | null;
};

export function HeroShowcase() {
  const [slides, setSlides] = useState<SiteMedia[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    supabase
      .from("site_media")
      .select("id, kind, url, poster_url, title, subtitle")
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .then(({ data }) => setSlides((data as SiteMedia[]) ?? []));
  }, []);

  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % slides.length), 6000);
    return () => clearInterval(t);
  }, [slides.length]);

  const current = slides[index];

  return (
    <div className="absolute inset-0">
      {slides.length === 0 ? (
        <img
          src={heroImage}
          alt=""
          width={1600}
          height={1000}
          className="w-full h-full object-cover opacity-70"
        />
      ) : (
        slides.map((s, i) => (
          <div
            key={s.id}
            className={`absolute inset-0 transition-opacity duration-1000 ${i === index ? "opacity-70" : "opacity-0"}`}
          >
            {s.kind === "video" ? (
              <video
                src={s.url}
                poster={s.poster_url ?? undefined}
                autoPlay
                muted
                loop
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <img src={s.url} alt={s.title ?? ""} className="w-full h-full object-cover" />
            )}
          </div>
        ))
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-[var(--ink)] via-[var(--ink)]/70 to-transparent" />
      {current?.title && (
        <div className="absolute bottom-5 right-5 hidden md:block text-right max-w-xs">
          <div className="font-display text-xl text-[var(--cream)]">{current.title}</div>
          {current.subtitle && (
            <div className="text-sm text-[var(--cream)]/70">{current.subtitle}</div>
          )}
        </div>
      )}
      {slides.length > 1 && (
        <div className="absolute bottom-5 left-5 flex gap-2">
          {slides.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setIndex(i)}
              aria-label={`Show media ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${i === index ? "w-8 bg-[var(--accent)]" : "w-3 bg-[var(--cream)]/40"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Grid of all active media — photos and videos of the bakes. */
export function MediaGallery() {
  const [items, setItems] = useState<SiteMedia[]>([]);

  useEffect(() => {
    supabase
      .from("site_media")
      .select("id, kind, url, poster_url, title, subtitle")
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .then(({ data }) => setItems((data as SiteMedia[]) ?? []));
  }, []);

  if (items.length === 0) return null;

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
      <span className="chip bg-[var(--secondary)] text-[var(--secondary-foreground)]">The gallery</span>
      <h2 className="mt-3 font-display text-3xl sm:text-4xl">Straight from the kitchen</h2>
      <div className="mt-8 grid gap-4 grid-cols-2 md:grid-cols-3">
        {items.map((m) => (
          <figure key={m.id} className="card-soft overflow-hidden aspect-square group">
            {m.kind === "video" ? (
              <video
                src={m.url}
                poster={m.poster_url ?? undefined}
                muted
                loop
                playsInline
                autoPlay
                className="w-full h-full object-cover"
              />
            ) : (
              <img
                src={m.url}
                alt={m.title ?? "Kookie Queen bake"}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            )}
          </figure>
        ))}
      </div>
    </section>
  );
}
