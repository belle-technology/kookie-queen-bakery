import { Star } from "lucide-react";

interface StarRatingProps {
  value: number;
  onChange?: (n: number) => void;
  size?: number;
  showEmpty?: boolean;
}

export function StarRating({ value, onChange, size = 18, showEmpty = true }: StarRatingProps) {
  const interactive = !!onChange;
  return (
    <div className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= Math.round(value);
        return (
          <button
            key={n}
            type="button"
            disabled={!interactive}
            onClick={() => onChange?.(n)}
            className={interactive ? "cursor-pointer transition-transform hover:scale-110" : "cursor-default"}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
          >
            <Star
              width={size}
              height={size}
              className={
                filled
                  ? "fill-[oklch(0.82_0.12_355)] stroke-[oklch(0.82_0.12_355)]"
                  : showEmpty
                    ? "fill-transparent stroke-[oklch(0.75_0.02_150)]"
                    : "fill-transparent stroke-transparent"
              }
            />
          </button>
        );
      })}
    </div>
  );
}
