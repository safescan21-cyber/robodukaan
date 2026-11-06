"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase-browser";
import { revalidateCatalog, adminField } from "@/lib/admin";
import { productImage } from "@/lib/format";
import { ProductImage } from "@/components/ProductImage";
import type { Category, Product } from "@/lib/types";

const PAGE = 50;

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [stock, setStock] = useState(() => (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("stock") === "low" ? "low" : ""));
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    let req = getSupabase()
      .from("products")
      .select("id, slug, sku, name, price, mrp, stock, is_active, is_featured, image_url, images, sold_count, category_id, category:categories(slug, name, icon)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(page * PAGE, page * PAGE + PAGE - 1);
    const term = q.trim().replace(/[%,()*\\]/g, " ");
    if (term) req = req.or(`name.ilike.%${term}%,sku.ilike.%${term}%,brand.ilike.%${term}%`);
    if (category) req = req.eq("category_id", Number(category));
    if (stock === "low") req = req.lte("stock", 5);
    if (stock === "out") req = req.eq("stock", 0);
    const { data, count } = await req;
    setProducts(((data ?? []) as unknown as Product[]).map((p) => ({ ...p, price: Number(p.price) })));
    setTotal(count ?? 0);
  }, [q, category, stock, page]);

  useEffect(() => {
    getSupabase().from("categories").select("*").order("sort_order").then(({ data }) => setCategories((data as Category[]) ?? []));
  }, []);
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  async function patch(id: string, values: Partial<Product>) {
    setProducts((cur) => cur?.map((p) => (p.id === id ? { ...p, ...values } : p)) ?? null);
    const { error } = await getSupabase().from("products").update({ ...values, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) {
      alert(error.message);
      load();
    } else revalidateCatalog();
  }

  async function remove(p: Product) {
    if (!confirm(`Delete “${p.name}”? If it has orders, hide it instead.`)) return;
    const { error } = await getSupabase().from("products").delete().eq("id", p.id);
    if (error) alert(error.message.includes("foreign key") ? "This product has orders. Hide it instead of deleting." : error.message);
    else {
      revalidateCatalog();
      load();
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Products <span className="text-base font-normal text-slate-500">({total})</span></h1>
        <Link href="/admin/products/new" className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">+ Add product</Link>
      </div>
      <div className="grid gap-3 rounded-md bg-white p-3 ring-1 ring-slate-200 sm:grid-cols-[1fr_200px_160px]">
        <input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Search name, SKU, brand…" className={adminField} aria-label="Search products" />
        <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(0); }} className={adminField} aria-label="Category">
          <option value="">All categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={stock} onChange={(e) => { setStock(e.target.value); setPage(0); }} className={adminField} aria-label="Stock">
          <option value="">Any stock</option>
          <option value="low">Low stock (≤5)</option>
          <option value="out">Out of stock</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-md bg-white ring-1 ring-slate-200">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-600">
            <tr>
              <th className="px-3 py-3">Product</th><th className="px-3 py-3">Category</th><th className="px-3 py-3">Price / MRP</th>
              <th className="px-3 py-3">Stock</th><th className="px-3 py-3">Sold</th><th className="px-3 py-3 text-center">Featured</th>
              <th className="px-3 py-3 text-center">Visible</th><th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {products === null && <tr><td colSpan={8} className="p-4 text-slate-500">Loading…</td></tr>}
            {products?.length === 0 && <tr><td colSpan={8} className="p-4 text-slate-500">No products found.</td></tr>}
            {products?.map((p) => (
              <tr key={p.id} className={p.is_active ? "" : "bg-slate-50 text-slate-500"}>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-3">
                    <span className="h-10 w-10 shrink-0 overflow-hidden rounded border border-slate-200 bg-white p-0.5">
                      <ProductImage imageUrl={productImage(p)} icon={p.category?.icon ?? "chip"} name="" size="sm" />
                    </span>
                    <span>
                      <Link href={`/admin/products/${p.id}`} className="font-medium hover:text-brand-700">{p.name}</Link>
                      <span className="block text-xs text-slate-500">{p.sku}</span>
                    </span>
                  </div>
                </td>
                <td className="px-3 py-2 text-slate-600">{p.category?.name}</td>
                <td className="px-3 py-2">
                  <label className="flex items-center gap-1 text-xs text-slate-500">₹
                    <input
                      type="number" min={0} step="1" defaultValue={p.price} aria-label={`Price for ${p.name}`}
                      onBlur={(e) => {
                        const v = Number(e.target.value);
                        if (!Number.isFinite(v) || v < 0) { e.target.value = String(p.price); return; }
                        if (p.mrp != null && v > Number(p.mrp)) { alert("Price can't be higher than the MRP. Raise the MRP first."); e.target.value = String(p.price); return; }
                        if (v !== p.price) patch(p.id, { price: v });
                      }}
                      className="w-24 rounded border border-slate-300 px-2 py-1 text-sm font-semibold text-slate-900"
                    />
                  </label>
                  <label className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">MRP
                    <input
                      type="number" min={0} step="1" defaultValue={p.mrp ?? ""} placeholder="—" aria-label={`MRP for ${p.name}`}
                      onBlur={(e) => {
                        const raw = e.target.value.trim();
                        const v = raw === "" ? null : Number(raw);
                        if (v != null && v < p.price) { alert("MRP can't be lower than the price."); e.target.value = p.mrp == null ? "" : String(p.mrp); return; }
                        if (v !== (p.mrp == null ? null : Number(p.mrp))) patch(p.id, { mrp: v });
                      }}
                      className="w-[84px] rounded border border-slate-200 px-2 py-0.5 text-xs line-through decoration-slate-300"
                    />
                  </label>
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number" min={0} defaultValue={p.stock} aria-label={`Stock for ${p.name}`}
                    onBlur={(e) => { const v = Math.max(0, Number(e.target.value)); if (v !== p.stock) patch(p.id, { stock: v }); }}
                    className={`w-20 rounded border px-2 py-1 ${p.stock === 0 ? "border-red-300 text-red-600" : p.stock <= 5 ? "border-amber-300 text-amber-700" : "border-slate-300"}`}
                  />
                </td>
                <td className="px-3 py-2">{p.sold_count}</td>
                <td className="px-3 py-2 text-center"><input type="checkbox" checked={p.is_featured} onChange={(e) => patch(p.id, { is_featured: e.target.checked })} className="h-4 w-4 accent-brand-600" aria-label="Featured" /></td>
                <td className="px-3 py-2 text-center"><input type="checkbox" checked={p.is_active} onChange={(e) => patch(p.id, { is_active: e.target.checked })} className="h-4 w-4 accent-brand-600" aria-label="Visible in store" /></td>
                <td className="whitespace-nowrap px-3 py-2 text-right text-xs font-semibold">
                  <Link href={`/admin/products/${p.id}`} className="text-brand-700 hover:underline">Edit</Link>
                  {p.is_active && <a href={`/products/${p.slug}`} target="_blank" className="ml-3 text-slate-500 hover:underline">View</a>}
                  <button onClick={() => remove(p)} className="ml-3 text-red-600 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {total > PAGE && (
        <div className="flex justify-center gap-2">
          <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm disabled:opacity-40">← Prev</button>
          <span className="px-2 py-1.5 text-sm">Page {page + 1} of {Math.ceil(total / PAGE)}</span>
          <button disabled={(page + 1) * PAGE >= total} onClick={() => setPage((p) => p + 1)} className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm disabled:opacity-40">Next →</button>
        </div>
      )}
    </div>
  );
}
