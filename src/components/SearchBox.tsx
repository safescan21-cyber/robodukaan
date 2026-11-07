"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useI18n, useRouter } from "@/i18n/client";
import { formatINR } from "@/lib/format";

type Suggestion = { name: string; slug: string; sku: string; price: number; image: string | null };
type Result = { total: number; products: Suggestion[]; categories: { name: string; slug: string }[] };

// The header search input with suggestions as you type (products + categories).
// Enter still submits the normal search form, so it works without JavaScript too.
export function SearchBox({ placeholder, label }: { placeholder: string; label: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const listId = useId();
  const [q, setQ] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((data: Result) => { setResult(data); setActive(-1); setOpen(true); })
        .catch(() => {});
    }, 200);
    return () => { clearTimeout(timer); ctrl.abort(); };
  }, [q]);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const items = [
    ...(result?.categories ?? []).map((c) => ({ key: `c-${c.slug}`, href: `/category/${c.slug}` })),
    ...(result?.products ?? []).map((p) => ({ key: `p-${p.slug}`, href: `/products/${p.slug}` })),
  ];
  const show = open && q.trim().length >= 2 && result;

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!show) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(items.length - 1, a + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(-1, a - 1)); }
    else if (e.key === "Escape") setOpen(false);
    else if (e.key === "Enter" && active >= 0) { e.preventDefault(); setOpen(false); router.push(items[active].href); }
  }

  return (
    <div ref={box} className="relative min-w-0 flex-1">
      <label htmlFor="site-search" className="sr-only">{label}</label>
      <input
        id="site-search"
        name="q"
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => result && setOpen(true)}
        onKeyDown={onKey}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={!!show}
        aria-controls={listId}
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        className="w-full rounded-l-md border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-brand-600 md:rounded-none"
      />
      {show && (
        <div id={listId} role="listbox" className="absolute inset-x-0 top-full z-50 mt-1 max-h-[70vh] overflow-y-auto rounded-md bg-white py-1 text-sm shadow-xl ring-1 ring-slate-200">
          {items.length === 0 && <p className="px-4 py-3 text-slate-500">{t("shop.noResults")}</p>}
          {result.categories.map((c, i) => (
            <a key={c.slug} id={`${listId}-${i}`} role="option" aria-selected={active === i}
              href={`/category/${c.slug}`} onClick={(e) => { e.preventDefault(); setOpen(false); router.push(`/category/${c.slug}`); }}
              className={`flex items-center gap-2 px-4 py-2 ${active === i ? "bg-brand-50" : "hover:bg-slate-50"}`}>
              <span className="text-xs font-semibold uppercase text-slate-400">{t("search.category")}</span>
              <span className="font-semibold text-brand-700">{c.name}</span>
            </a>
          ))}
          {result.products.map((p, j) => {
            const i = result.categories.length + j;
            return (
              <a key={p.slug} id={`${listId}-${i}`} role="option" aria-selected={active === i}
                href={`/products/${p.slug}`} onClick={(e) => { e.preventDefault(); setOpen(false); router.push(`/products/${p.slug}`); }}
                className={`flex items-center gap-3 px-4 py-2 ${active === i ? "bg-brand-50" : "hover:bg-slate-50"}`}>
                {p.image
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={p.image} alt="" className="h-9 w-9 shrink-0 rounded object-contain ring-1 ring-slate-100" />
                  : <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-brand-50 text-xs text-brand-600" aria-hidden="true">PCB</span>}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-slate-800">{p.name}</span>
                  <span className="block text-xs text-slate-500">{p.sku}</span>
                </span>
                <span className="shrink-0 font-semibold">{formatINR(p.price)}</span>
              </a>
            );
          })}
          {result.total > result.products.length && (
            <button type="submit" className="block w-full border-t border-slate-100 px-4 py-2 text-left text-sm font-semibold text-brand-700 hover:bg-slate-50">
              {t("search.seeAll", { count: result.total, q: q.trim() })}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
