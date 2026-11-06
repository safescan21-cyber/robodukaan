export function Stars({ value, count, size = "sm" }: { value: number; count?: number; size?: "sm" | "md" }) {
  const cls = size === "md" ? "h-5 w-5" : "h-3.5 w-3.5";
  return (
    <span className="inline-flex items-center gap-1" aria-label={`Rated ${value.toFixed(1)} out of 5`}>
      <span className="flex">
        {[1, 2, 3, 4, 5].map((i) => {
          const fill = Math.max(0, Math.min(1, value - (i - 1)));
          return (
            <svg key={i} viewBox="0 0 20 20" className={cls} aria-hidden="true">
              <defs>
                <linearGradient id={`star-${i}-${Math.round(fill * 100)}`}>
                  <stop offset={`${fill * 100}%`} stopColor="#f59e0b" />
                  <stop offset={`${fill * 100}%`} stopColor="#e2e8f0" />
                </linearGradient>
              </defs>
              <path
                fill={`url(#star-${i}-${Math.round(fill * 100)})`}
                d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.5 7.7l5.9-.9L10 1.5z"
              />
            </svg>
          );
        })}
      </span>
      {count != null && <span className="text-xs text-slate-500">({count})</span>}
    </span>
  );
}
