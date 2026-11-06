"use client";

export function Pager({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;
  const from = page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);
  const nums = Array.from({ length: pages }, (_, i) => i).filter((i) => i === 0 || i === pages - 1 || Math.abs(i - page) <= 2);
  return (
    <nav className="flex flex-wrap items-center justify-between gap-3 text-sm" aria-label="Pages">
      <span className="text-slate-600">Showing {from}–{to} of {total}</span>
      <div className="flex flex-wrap gap-1">
        <button disabled={page === 0} onClick={() => onPage(page - 1)} className="rounded border border-slate-300 bg-white px-3 py-1.5 disabled:opacity-40">← Prev</button>
        {nums.map((n, i) => (
          <span key={n} className="flex items-center gap-1">
            {i > 0 && n - nums[i - 1] > 1 && <span className="px-1 text-slate-400">…</span>}
            <button onClick={() => onPage(n)} aria-current={n === page ? "page" : undefined}
              className={`rounded border px-3 py-1.5 ${n === page ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300 bg-white hover:border-brand-600"}`}>
              {n + 1}
            </button>
          </span>
        ))}
        <button disabled={page >= pages - 1} onClick={() => onPage(page + 1)} className="rounded border border-slate-300 bg-white px-3 py-1.5 disabled:opacity-40">Next →</button>
      </div>
    </nav>
  );
}
