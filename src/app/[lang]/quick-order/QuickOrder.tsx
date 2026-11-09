"use client";

import { useState } from "react";
import Link, { useI18n, useRouter } from "@/i18n/client";
import { getSupabase } from "@/lib/supabase-browser";
import { useCart } from "@/components/CartProvider";
import { ProductImage } from "@/components/ProductImage";
import { QuoteForm } from "@/components/QuoteForm";
import { formatINR, productImage } from "@/lib/format";
import { unitPrice } from "@/lib/pricing";
import type { Product } from "@/lib/types";

type Line = { part: string; qty: number };
type Found = Pick<Product, "id" | "slug" | "sku" | "name" | "price" | "price_tiers" | "stock" | "image_url" | "images"> & { category?: { icon: string } | null };
type Row = { line: Line; product: Found | null; suggestions: { name: string; slug: string; sku: string }[]; qty: number };

const MAX_LINES = 100;

// "MW-EDR-120-24, 10" / "SSR-40DA<TAB>5" / "NDR-120-24 x 2" / just "SKU" (qty 1). Header rows are skipped.
export function parseLines(text: string): Line[] {
  const out: Line[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim().replace(/^"|"$/g, "");
    if (!line) continue;
    const cells = line.split(/\s*[,;\t]\s*|\s+[x×*]\s*|\s{2,}/).map((c) => c.replace(/^"|"$/g, "").trim()).filter(Boolean);
    let qty = 1;
    if (cells.length > 1 && /^\d{1,5}$/.test(cells[cells.length - 1])) qty = Number(cells.pop());
    else if (cells.length === 1) {
      const m = cells[0].match(/^(.*\S)\s+(\d{1,5})$/);
      if (m) { cells[0] = m[1]; qty = Number(m[2]); }
    }
    const part = cells[0]?.slice(0, 80);
    if (!part || /^(sku|part|part.?no|part.?number|mpn|item)$/i.test(part)) continue;
    const existing = out.find((l) => l.part.toUpperCase() === part.toUpperCase());
    if (existing) existing.qty += qty;
    else out.push({ part, qty: Math.max(1, qty) });
  }
  return out;
}

export function QuickOrder() {
  const { t } = useI18n();
  const router = useRouter();
  const { add } = useCart();
  const [text, setText] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function find() {
    const lines = parseLines(text);
    if (!lines.length) return setError(t("quick.empty"));
    if (lines.length > MAX_LINES) return setError(t("quick.tooMany", { n: MAX_LINES }));
    setBusy(true); setError(null);
    const skus = [...new Set(lines.map((l) => l.part.toUpperCase()))];
    const { data, error } = await getSupabase().from("products")
      .select("id, slug, sku, name, price, price_tiers, stock, image_url, images, category:categories(icon)")
      .eq("is_active", true).in("sku", skus);
    if (error) { setBusy(false); return setError(error.message); }
    const bySku = new Map((data as unknown as Found[]).map((p) => [p.sku.toUpperCase(), p]));
    const result: Row[] = await Promise.all(lines.map(async (line) => {
      const product = bySku.get(line.part.toUpperCase()) ?? null;
      let suggestions: Row["suggestions"] = [];
      if (!product) {
        const r = await fetch(`/api/search?q=${encodeURIComponent(line.part)}`).then((x) => x.json()).catch(() => null);
        suggestions = (r?.products ?? []).slice(0, 3);
      }
      return { line, product, suggestions, qty: product ? Math.min(line.qty, Math.max(product.stock, 0)) : line.qty };
    }));
    setRows(result);
    setBusy(false);
  }

  // Swap a "not found" line for a suggested product.
  async function choose(i: number, slug: string) {
    const { data } = await getSupabase().from("products")
      .select("id, slug, sku, name, price, price_tiers, stock, image_url, images, category:categories(icon)").eq("slug", slug).maybeSingle();
    if (!data) return;
    const p = data as unknown as Found;
    setRows((cur) => cur && cur.map((r, j) => (j === i ? { ...r, product: p, suggestions: [], qty: Math.min(r.line.qty, Math.max(p.stock, 0)) } : r)));
  }

  const ok = rows?.filter((r) => r.product && r.qty > 0) ?? [];
  const missing = rows?.filter((r) => !r.product) ?? [];
  const short = rows?.filter((r) => r.product && r.line.qty > r.product.stock) ?? [];
  const total = ok.reduce((n, r) => n + unitPrice(r.product!.price, r.product!.price_tiers, r.qty) * r.qty, 0);

  function addAll() {
    for (const r of ok) {
      const p = r.product!;
      add({ productId: p.id, slug: p.slug, name: p.name, price: p.price, icon: p.category?.icon ?? "chip", imageUrl: productImage(p), stock: p.stock, ...(p.price_tiers?.length ? { tiers: p.price_tiers } : {}) }, r.qty);
    }
    router.push("/cart");
  }

  const field = "w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100";
  return (
    <div className="space-y-5">
      <div className="rounded-md bg-white p-4 ring-1 ring-slate-200 sm:p-5">
        <label htmlFor="bom" className="block text-sm font-semibold">{t("quick.paste")}</label>
        <p className="mb-2 text-xs text-slate-500">{t("quick.format")}</p>
        <textarea id="bom" value={text} onChange={(e) => setText(e.target.value)} rows={8} spellCheck={false}
          placeholder={"MW-EDR-120-24, 10\nSSR-40DA, 25\nVFD022E43A  2"} className={`${field} font-mono`} />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button type="button" onClick={find} disabled={busy} className="rounded-md bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">{busy ? t("quick.finding") : t("quick.find")}</button>
          <label className="cursor-pointer rounded-md px-4 py-2.5 text-sm font-semibold text-brand-700 ring-1 ring-brand-200 hover:bg-brand-50">
            📄 {t("quick.upload")}
            <input type="file" accept=".csv,.txt,text/csv,text/plain" className="sr-only" onChange={async (e) => {
              const f = e.target.files?.[0]; e.target.value = "";
              if (!f) return;
              if (/\.xlsx?$/i.test(f.name) || f.size > 500_000) return setError(t("quick.csvOnly"));
              setText(await f.text()); setRows(null);
            }} />
          </label>
          {text && <button type="button" onClick={() => { setText(""); setRows(null); }} className="text-sm text-slate-500 hover:underline">{t("quick.clear")}</button>}
        </div>
        {error && <p role="alert" className="mt-3 rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}
      </div>

      {rows && (
        <div className="overflow-hidden rounded-md bg-white ring-1 ring-slate-200">
          <p className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold">
            {t("quick.summary", { found: rows.length - missing.length, total: rows.length })}
          </p>
          <ul className="divide-y divide-slate-100">
            {rows.map((r, i) => {
              const p = r.product;
              const each = p ? unitPrice(p.price, p.price_tiers, r.qty) : 0;
              return (
                <li key={r.line.part} className="grid grid-cols-[48px_1fr] gap-3 p-3 sm:grid-cols-[48px_1fr_110px_120px]">
                  <div className="h-12 w-12 overflow-hidden rounded border border-slate-200 bg-white p-0.5">
                    {p ? <ProductImage imageUrl={productImage(p)} icon={p.category?.icon ?? "chip"} name={p.name} size="sm" /> : <span className="flex h-full items-center justify-center text-lg text-slate-400">?</span>}
                  </div>
                  <div className="min-w-0 text-sm">
                    <p className="font-mono text-xs text-slate-500">{r.line.part} × {r.line.qty}</p>
                    {p ? (
                      <>
                        <Link href={`/products/${p.slug}`} className="font-medium hover:text-brand-700">✓ {p.name}</Link>
                        {r.line.qty > p.stock && <p className="text-xs text-amber-700">{p.stock > 0 ? t("quick.onlyStock", { n: p.stock }) : t("quick.outOfStock")}</p>}
                      </>
                    ) : r.suggestions.length ? (
                      <div>
                        <p className="text-amber-700">{t("quick.didYouMean")}</p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {r.suggestions.map((s) => <button key={s.slug} type="button" onClick={() => choose(i, s.slug)} className="rounded bg-amber-50 px-2 py-0.5 text-xs ring-1 ring-amber-200 hover:bg-amber-100">{s.sku} – {s.name.slice(0, 40)}</button>)}
                        </div>
                      </div>
                    ) : <p className="text-red-600">✕ {t("quick.notFound")}</p>}
                  </div>
                  {p && (
                    <>
                      <label className="col-start-2 flex items-center gap-2 text-xs sm:col-start-auto">{t("form.quantity")}
                        <input type="number" min={0} max={p.stock} value={r.qty} onChange={(e) => { const v = Math.max(0, Math.min(p.stock, parseInt(e.target.value || "0", 10))); setRows((cur) => cur && cur.map((x, j) => (j === i ? { ...x, qty: v } : x))); }}
                          className="w-20 rounded border border-slate-300 px-2 py-1 text-sm" />
                      </label>
                      <p className="col-start-2 text-sm sm:col-start-auto sm:text-end">
                        <span className="font-semibold">{formatINR(each * r.qty)}</span>
                        <span className="block text-xs text-slate-500">{formatINR(each)} {t("tiers.each")}{each < p.price ? ` · ${t("tiers.applied")}` : ""}</span>
                      </p>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 p-4">
            <p className="text-sm">{t("quick.total", { n: ok.length })} <b className="text-lg">{formatINR(total)}</b> <span className="text-xs text-slate-500">{t("product.plusGst")}</span></p>
            <button type="button" onClick={addAll} disabled={!ok.length} className="rounded-md bg-accent-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-accent-600 disabled:opacity-50">🛒 {t("quick.addAll", { n: ok.length })}</button>
          </div>
        </div>
      )}

      {rows && (missing.length > 0 || short.length > 0) && (
        <div className="rounded-md bg-white p-4 ring-1 ring-slate-200">
          <p className="mb-1 font-semibold">{t("quick.quoteTitle")}</p>
          <p className="mb-3 text-sm text-slate-600">{t("quick.quoteText")}</p>
          <QuoteForm key={[...missing, ...short].map((r) => `${r.line.part}:${r.product?.stock ?? ""}`).join("|")} startOpen productName={t("quick.quoteProduct", { n: missing.length + short.length })}
            defaultQuantity={[...missing, ...short].reduce((n, r) => n + r.line.qty, 0)}
            defaultMessage={[...missing.map((r) => `${r.line.part} × ${r.line.qty}`), ...short.map((r) => `${r.product!.sku} × ${r.line.qty} (only ${r.product!.stock} in stock)`)].join("\n").slice(0, 2000)} />
        </div>
      )}
    </div>
  );
}
