"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase-browser";
import { DOC_ACCEPT, uploadDocument, adminButton, adminField, revalidateCatalog, uploadImage, uploadVideo } from "@/lib/admin";
import { slugify } from "@/lib/format";
import type { Category, Faq, Product, ProductDocument } from "@/lib/types";

type Row = { k: string; v: string };

export function ProductForm({ product }: { product?: Product }) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!!product);
  const [images, setImages] = useState<string[]>(product ? [...product.images, ...(product.image_url && !product.images.includes(product.image_url) ? [product.image_url] : [])] : []);
  const [videos, setVideos] = useState<string[]>(product?.videos ?? []);
  const [videoUploading, setVideoUploading] = useState(false);
  const [specs, setSpecs] = useState<Row[]>(Object.entries(product?.specs ?? {}).map(([k, v]) => ({ k, v: String(v) })));
  const [faqs, setFaqs] = useState<Faq[]>(product?.faqs ?? []);
  const [docs, setDocs] = useState<ProductDocument[]>(product?.documents ?? []);
  const [uploading, setUploading] = useState(false);
  const [docUploading, setDocUploading] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSupabase().from("categories").select("*").order("sort_order").then(({ data }) => setCategories((data as Category[]) ?? []));
  }, []);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError(null);
    try {
      const urls: string[] = [];
      for (const f of Array.from(files)) urls.push(await uploadImage(f));
      setImages((cur) => [...cur, ...urls]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    }
    setUploading(false);
  }

  async function onVideos(files: FileList | null) {
    if (!files?.length) return;
    setVideoUploading(true);
    setError(null);
    try {
      const urls: string[] = [];
      for (const f of Array.from(files)) urls.push(await uploadVideo(f, "product-videos"));
      setVideos((cur) => [...cur, ...urls]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    }
    setVideoUploading(false);
  }

  // Technical data: upload datasheets/manuals/drawings; each becomes a download on the product page.
  async function addDocs(list: FileList | null) {
    if (!list?.length) return;
    setError(null);
    for (const file of Array.from(list)) {
      setDocUploading(file.name);
      try {
        const doc = await uploadDocument(file);
        setDocs((s) => [...s, doc]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed");
        break;
      }
    }
    setDocUploading(null);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const num = (k: string) => (String(f.get(k) ?? "").trim() === "" ? null : Number(f.get(k)));
    const price = num("price") ?? 0;
    const mrp = num("mrp");
    if (mrp != null && mrp < price) return setError("MRP can't be lower than the selling price.");
    const values = {
      name: name.trim(),
      slug: slugify(slug || name),
      sku: String(f.get("sku")).trim().toUpperCase(),
      brand: String(f.get("brand")).trim() || null,
      category_id: Number(f.get("category_id")),
      short_description: String(f.get("short_description")).trim() || null,
      description: String(f.get("description")).trim() || null,
      price,
      mrp,
      stock: num("stock") ?? 0,
      warranty_months: num("warranty_months") ?? 0,
      hsn_code: String(f.get("hsn_code") ?? "").trim() || null,
      ...bisPatch(String(f.get("bis_number") ?? "").trim().toUpperCase(), product?.bis_number),
      // Only sent when used, so saving still works before migration 009 adds the column.
      ...equivalentsPatch(String(f.get("equivalents") ?? "").trim(), product?.equivalents),
      ready_to_dispatch: f.get("ready_to_dispatch") === "on",
      is_featured: f.get("is_featured") === "on",
      ...newArrivalPatch(f.get("is_new_arrival") === "on", product?.is_new_arrival),
      is_active: f.get("is_active") === "on",
      images,
      videos,
      image_url: images[0] ?? null,
      specs: Object.fromEntries(specs.filter((r) => r.k.trim() && r.v.trim()).map((r) => [r.k.trim(), r.v.trim()])),
      faqs: faqs.filter((x) => x.q.trim() && x.a.trim()),
      documents: docs.filter((d) => d.name.trim() && /^https?:\/\//.test(d.url.trim())),
      updated_at: new Date().toISOString(),
    };
    setSaving(true);
    setError(null);
    const supabase = getSupabase();
    const { error } = product
      ? await supabase.from("products").update(values).eq("id", product.id)
      : await supabase.from("products").insert(values);
    setSaving(false);
    if (error) {
      setError(error.message.includes("duplicate key") ? "Another product already uses this SKU or URL slug." : error.message);
      return;
    }
    // Refresh the shop and tell search engines about the product page (and its category).
    const categorySlug = categories.find((c) => c.id === values.category_id)?.slug;
    await revalidateCatalog([`/products/${values.slug}`, ...(categorySlug ? [`/category/${categorySlug}`] : [])]);
    router.push("/admin/products");
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-6 xl:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        <section className="space-y-4 rounded-md bg-white p-5 ring-1 ring-slate-200">
          <h2 className="text-sm font-bold uppercase tracking-wide">Basic details</h2>
          <label className="block text-sm font-medium">Product name *
            <input value={name} onChange={(e) => { setName(e.target.value); if (!slugTouched) setSlug(slugify(e.target.value)); }} required className={adminField} />
          </label>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block text-sm font-medium sm:col-span-2">URL slug *
              <input value={slug} onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }} required pattern="[a-z0-9-]+" className={adminField} />
            </label>
            <label className="block text-sm font-medium">SKU *<input name="sku" required defaultValue={product?.sku} className={`${adminField} uppercase`} /></label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium">Category *
              <select name="category_id" required defaultValue={product?.category_id ?? ""} className={adminField}>
                <option value="" disabled>Select category</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label className="block text-sm font-medium">Brand<input name="brand" defaultValue={product?.brand ?? ""} className={adminField} /></label>
            <label className="block text-sm font-medium sm:col-span-2">Replaces part numbers <span className="font-normal text-slate-500">(other brands, comma separated – customers can search by these)</span>
              <input name="equivalents" defaultValue={product?.equivalents ?? ""} maxLength={500} placeholder="e.g. Omron E2E-X8MD1, Autonics PR18-8DN, Mean Well NDR-120-24" className={adminField} />
            </label>
          </div>
          <label className="block text-sm font-medium">Short description<input name="short_description" maxLength={200} defaultValue={product?.short_description ?? ""} className={adminField} /></label>
          <label className="block text-sm font-medium">Full description<textarea name="description" rows={6} defaultValue={product?.description ?? ""} className={adminField} /></label>
        </section>

        <section className="space-y-4 rounded-md bg-white p-5 ring-1 ring-slate-200">
          <h2 className="text-sm font-bold uppercase tracking-wide">Images</h2>
          <div className="flex flex-wrap gap-3">
            {images.map((src, i) => (
              <div key={src} className="relative h-24 w-24 overflow-hidden rounded border border-slate-200 bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="h-full w-full object-contain" />
                {i === 0 && <span className="absolute left-0 top-0 bg-brand-600 px-1 text-[10px] font-bold text-white">MAIN</span>}
                <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/50 px-1 text-xs text-white">
                  <button type="button" disabled={i === 0} onClick={() => setImages((cur) => { const n = [...cur]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; return n; })} aria-label="Move left">◀</button>
                  <button type="button" onClick={() => setImages((cur) => cur.filter((_, j) => j !== i))} aria-label="Remove image">✕</button>
                </div>
              </div>
            ))}
            <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center rounded border-2 border-dashed border-slate-300 text-center text-xs text-slate-500 hover:border-brand-600">
              {uploading ? "Uploading…" : <><span className="text-2xl">＋</span>Add images</>}
              <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }} />
            </label>
          </div>
          <p className="text-xs text-slate-500">JPG, PNG or WebP under 5 MB. The first image is the main one.</p>
        </section>

        <section className="space-y-4 rounded-md bg-white p-5 ring-1 ring-slate-200">
          <h2 className="text-sm font-bold uppercase tracking-wide">Videos</h2>
          <div className="flex flex-wrap gap-3">
            {videos.map((src, i) => (
              <div key={src} className="relative w-40 overflow-hidden rounded border border-slate-200 bg-black">
                <video src={src} className="h-24 w-full object-cover" muted preload="metadata" />
                <button type="button" onClick={() => setVideos((cur) => cur.filter((_, j) => j !== i))} className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs text-white" aria-label="Remove video">✕</button>
              </div>
            ))}
            <label className="flex h-24 w-40 cursor-pointer flex-col items-center justify-center rounded border-2 border-dashed border-slate-300 text-center text-xs text-slate-500 hover:border-brand-600">
              {videoUploading ? "Uploading…" : <><span className="text-2xl">🎬</span>Add videos</>}
              <input type="file" accept="video/mp4,video/webm,video/quicktime" multiple className="sr-only" onChange={(e) => { onVideos(e.target.files); e.target.value = ""; }} />
            </label>
          </div>
          <p className="text-xs text-slate-500">MP4 or WebM up to 50 MB each — e.g. a working demo or how to wire it. Shown in the product gallery.</p>
        </section>

        <section className="space-y-3 rounded-md bg-white p-5 ring-1 ring-slate-200">
          <h2 className="text-sm font-bold uppercase tracking-wide">Specifications</h2>
          {specs.map((r, i) => (
            <div key={i} className="flex gap-2">
              <input value={r.k} onChange={(e) => setSpecs((s) => s.map((x, j) => (j === i ? { ...x, k: e.target.value } : x)))} placeholder="e.g. Voltage" className={`${adminField} mt-0`} aria-label="Specification name" />
              <input value={r.v} onChange={(e) => setSpecs((s) => s.map((x, j) => (j === i ? { ...x, v: e.target.value } : x)))} placeholder="e.g. 5V" className={`${adminField} mt-0`} aria-label="Specification value" />
              <button type="button" onClick={() => setSpecs((s) => s.filter((_, j) => j !== i))} className="px-2 text-red-600" aria-label="Remove">✕</button>
            </div>
          ))}
          <button type="button" onClick={() => setSpecs((s) => [...s, { k: "", v: "" }])} className="text-sm font-semibold text-brand-700">+ Add specification</button>
        </section>

        <section className="space-y-3 rounded-md bg-white p-5 ring-1 ring-slate-200">
          <h2 className="text-sm font-bold uppercase tracking-wide">FAQs</h2>
          {faqs.map((x, i) => (
            <div key={i} className="space-y-2 rounded border border-slate-200 p-3">
              <input value={x.q} onChange={(e) => setFaqs((s) => s.map((y, j) => (j === i ? { ...y, q: e.target.value } : y)))} placeholder="Question" className={`${adminField} mt-0`} aria-label="Question" />
              <textarea value={x.a} onChange={(e) => setFaqs((s) => s.map((y, j) => (j === i ? { ...y, a: e.target.value } : y)))} placeholder="Answer" rows={2} className={`${adminField} mt-0`} aria-label="Answer" />
              <button type="button" onClick={() => setFaqs((s) => s.filter((_, j) => j !== i))} className="text-xs font-semibold text-red-600">Remove</button>
            </div>
          ))}
          <button type="button" onClick={() => setFaqs((s) => [...s, { q: "", a: "" }])} className="text-sm font-semibold text-brand-700">+ Add FAQ</button>
        </section>

        <section className="space-y-3 rounded-md bg-white p-5 ring-1 ring-slate-200">
          <h2 className="text-sm font-bold uppercase tracking-wide">Technical data (customers can download)</h2>
          <p className="text-xs text-slate-500">Datasheets, manuals, wiring diagrams, drawings: PDF, Word, Excel, ZIP, images, DWG/STEP – up to 25 MB each. The name is what customers see.</p>
          {docs.map((d, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
              {d.type && <span className="shrink-0 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">{d.type}</span>}
              <input value={d.name} onChange={(e) => setDocs((s) => s.map((y, j) => (j === i ? { ...y, name: e.target.value } : y)))} placeholder="Datasheet" className={`${adminField} mt-0`} aria-label="Document name" />
              <input value={d.url} onChange={(e) => setDocs((s) => s.map((y, j) => (j === i ? { ...y, url: e.target.value } : y)))} placeholder="https://…" className={`${adminField} mt-0`} aria-label="Document link" />
              <button type="button" onClick={() => setDocs((s) => s.filter((_, j) => j !== i))} className="px-2 text-red-600" aria-label="Remove">✕</button>
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-3">
            <label className={`cursor-pointer rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 ${docUploading ? "pointer-events-none opacity-60" : ""}`}>
              {docUploading ? `Uploading ${docUploading}…` : "⬆ Upload files"}
              <input type="file" multiple accept={DOC_ACCEPT} className="sr-only" onChange={(e) => { addDocs(e.target.files); e.target.value = ""; }} />
            </label>
            <button type="button" onClick={() => setDocs((s) => [...s, { name: "", url: "" }])} className="text-sm font-semibold text-brand-700">+ Add link instead</button>
          </div>
        </section>
      </div>

      <aside className="space-y-6">
        <section className="space-y-4 rounded-md bg-white p-5 ring-1 ring-slate-200">
          <h2 className="text-sm font-bold uppercase tracking-wide">Price &amp; stock</h2>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-medium">Price excl. GST (₹) *<input name="price" type="number" min={0} step="0.01" required defaultValue={product?.price} className={adminField} /></label>
            <label className="block text-sm font-medium">MRP (₹)<input name="mrp" type="number" min={0} step="0.01" defaultValue={product?.mrp ?? ""} className={adminField} /></label>
            <label className="block text-sm font-medium">Stock *<input name="stock" type="number" min={0} required defaultValue={product?.stock ?? 0} className={adminField} /></label>
            <label className="block text-sm font-medium">Warranty (months)<input name="warranty_months" type="number" min={0} defaultValue={product?.warranty_months ?? 0} className={adminField} /></label>
            <label className="col-span-2 block text-sm font-medium">HSN code<input name="hsn_code" defaultValue={product?.hsn_code ?? ""} placeholder="blank = use the category’s HSN" className={adminField} /></label>
            <label className="col-span-2 block text-sm font-medium">BIS registration no. <span className="font-normal text-slate-500">(required by law for SMPS / adaptors up to 48 V – shown on the product page)</span><input name="bis_number" defaultValue={product?.bis_number ?? ""} maxLength={40} placeholder="e.g. R-41012345" className={`${adminField} uppercase`} /></label>
          </div>
          <p className="text-xs text-slate-500">Enter prices <b>excluding GST</b>. 18% GST is added at checkout.</p>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="ready_to_dispatch" defaultChecked={product?.ready_to_dispatch ?? true} className="h-4 w-4 accent-brand-600" />Ready to dispatch (ships in 24h)</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_featured" defaultChecked={product?.is_featured ?? false} className="h-4 w-4 accent-brand-600" />Featured (shows in Deals of the day)</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_new_arrival" defaultChecked={product?.is_new_arrival ?? !product} className="h-4 w-4 accent-brand-600" />New arrival (shows in New arrivals with a NEW badge)</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_active" defaultChecked={product?.is_active ?? true} className="h-4 w-4 accent-brand-600" />Visible in store</label>
        </section>
        {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
        <div className="flex gap-3">
          <button disabled={saving || uploading || videoUploading} className={`${adminButton} flex-1 py-2.5`}>{saving ? "Saving…" : product ? "Save changes" : "Create product"}</button>
          <Link href="/admin/products" className="rounded-md px-4 py-2.5 text-sm font-semibold text-slate-600 ring-1 ring-slate-300 hover:bg-slate-50">Cancel</Link>
        </div>
      </aside>
    </form>
  );
}

// Only include "equivalents" when it's used, so saving still works before migration 009 adds the column.
function equivalentsPatch(value: string, current: string | null | undefined): { equivalents?: string | null } {
  if (value) return { equivalents: value };
  return current ? { equivalents: null } : {};
}

// Only include "is_new_arrival" when it's used, so saving still works before migration 010 adds the column.
function newArrivalPatch(checked: boolean, current: boolean | undefined): { is_new_arrival?: boolean } {
  if (checked) return { is_new_arrival: true };
  return current ? { is_new_arrival: false } : {};
}

// Only include "bis_number" when it's used, so saving still works before migration 016 adds the column.
function bisPatch(value: string, current: string | null | undefined): { bis_number?: string | null } {
  if (value) return { bis_number: value };
  return current ? { bis_number: null } : {};
}
