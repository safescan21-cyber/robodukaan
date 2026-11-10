"use client";

import { useEffect, useState } from "react";
import Link, { useI18n } from "@/i18n/client";
import { getSupabase } from "@/lib/supabase-browser";
import { useCompare } from "@/components/CompareProvider";
import { AddToCartButton } from "@/components/AddToCartButton";
import { ProductImage } from "@/components/ProductImage";
import { formatINR, productImage } from "@/lib/format";
import { validTiers } from "@/lib/pricing";
import type { Product } from "@/lib/types";

type P = Product & { category: { name: string; slug: string; icon: string } | null };

export function CompareView() {
  const { ids, remove, clear } = useCompare();
  const { t } = useI18n();
  const [items, setItems] = useState<P[] | null>(null);

  useEffect(() => {
    if (!ids.length) { const t0 = setTimeout(() => setItems([]), 0); return () => clearTimeout(t0); }
    getSupabase().from("products").select("*, category:categories(name, slug, icon)").in("id", ids).eq("is_active", true)
      .then(({ data }) => setItems(((data as P[]) ?? []).sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id))));
  }, [ids]);

  if (items === null) return <div className="h-64 animate-pulse rounded-md bg-slate-100" />;
  if (!items.length) return <p className="rounded-md bg-white p-6 text-slate-600 ring-1 ring-slate-200">{t("compare.empty")} <Link href="/products" className="font-semibold text-brand-700 underline">{t("nav.shop")}</Link></p>;

  const specKeys = [...new Set(items.flatMap((p) => Object.keys(p.specs ?? {})))];
  const row = (label: string, cell: (p: P) => React.ReactNode, key = label) => (
    <tr key={key} className="border-t border-slate-100 align-top">
      <th scope="row" className="sticky start-0 w-32 bg-slate-50 px-3 py-2 text-start text-xs font-semibold uppercase text-slate-500">{label}</th>
      {items.map((p) => <td key={p.id} className="min-w-44 px-3 py-2 text-sm">{cell(p)}</td>)}
    </tr>
  );
  const prices = items.map((p) => p.price);
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-md bg-white ring-1 ring-slate-200">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="sticky start-0 w-32 bg-slate-50" />
              {items.map((p) => (
                <th key={p.id} className="min-w-44 px-3 py-3 text-start align-top font-normal">
                  <Link href={`/products/${p.slug}`} className="block h-24 w-24 overflow-hidden rounded border border-slate-200 bg-white p-1"><ProductImage imageUrl={productImage(p)} icon={p.category?.icon ?? "chip"} name={p.name} size="sm" /></Link>
                  <Link href={`/products/${p.slug}`} className="mt-2 line-clamp-3 block text-sm font-semibold hover:text-brand-700">{p.name}</Link>
                  <button type="button" onClick={() => remove(p.id)} className="mt-1 text-xs text-red-600 hover:underline">✕ {t("compare.remove")}</button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {row(t("compare.price"), (p) => <span className={`font-bold ${p.price === Math.min(...prices) && items.length > 1 ? "text-emerald-700" : ""}`}>{formatINR(p.price)} <span className="text-xs font-normal text-slate-500">{t("product.plusGst")}</span></span>)}
            {row(t("compare.bulk"), (p) => { const tiers = validTiers(p.price_tiers, p.price); return tiers.length ? tiers.map((x) => <span key={x.min_qty} className="block text-xs">{t("tiers.card", { qty: x.min_qty, price: formatINR(x.price) })}</span>) : "—"; })}
            {row(t("compare.stock"), (p) => p.stock > 0 ? <span className="text-emerald-700">✓ {t("compare.inStock")}</span> : <span className="text-red-600">{t("compare.outOfStock")}</span>)}
            {row(t("compare.brand"), (p) => p.brand || "—")}
            {row(t("compare.category"), (p) => p.category ? <Link href={`/category/${p.category.slug}`} className="text-brand-700 hover:underline">{p.category.name}</Link> : "—")}
            {row(t("compare.warranty"), (p) => p.warranty_months > 0 ? t("compare.warrantyMonths", { n: p.warranty_months }) : "—")}
            {row(t("product.origin"), (p) => p.country_of_origin || "—")}
            {row(t("compare.rating"), (p) => p.rating_count > 0 ? `★ ${Number(p.rating_avg).toFixed(1)} (${p.rating_count})` : "—")}
            {specKeys.map((k) => row(k, (p) => (p.specs ?? {})[k] || "—", `spec-${k}`))}
            {row("", (p) => <AddToCartButton product={p} compact />, "cart")}
          </tbody>
        </table>
      </div>
      <button type="button" onClick={clear} className="text-sm text-slate-500 hover:underline">{t("compare.clear")}</button>
    </div>
  );
}
