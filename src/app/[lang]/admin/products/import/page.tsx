"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase-browser";
import { adminField, revalidateCatalog, uploadImage } from "@/lib/admin";
import {
  IMPORT_COLUMNS, TEMPLATE_ROWS, tiersText, parseCsv, planImport, toCsv,
  type ExistingProduct, type ImportCategory, type PlannedRow,
} from "@/lib/product-import";

type Result = { line: number; sku: string; ok: boolean; message: string; slug?: string };

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Admin → Products → Bulk upload: add or update many products from one spreadsheet (CSV), with photos.
export default function ProductImportPage() {
  const [categories, setCategories] = useState<ImportCategory[]>([]);
  const [existing, setExisting] = useState<ExistingProduct[]>([]);
  const [table, setTable] = useState<string[][] | null>(null);
  const [fileName, setFileName] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState("");
  const [results, setResults] = useState<Result[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadExisting() {
    const supabase = getSupabase();
    const [c, p] = await Promise.all([
      supabase.from("categories").select("id, slug, name").order("sort_order"),
      supabase.from("products").select("id, sku, slug, images"),
    ]);
    if (c.error || p.error) setError((c.error ?? p.error)!.message);
    setCategories((c.data as ImportCategory[]) ?? []);
    setExisting((p.data as ExistingProduct[]) ?? []);
  }
  useEffect(() => {
    const t = setTimeout(loadExisting, 0);
    return () => clearTimeout(t);
  }, []);

  const plan = useMemo(
    () => (table ? planImport(table, categories, existing, photos.map((f) => ({ name: f.name }))) : null),
    [table, categories, existing, photos],
  );
  const ready = plan?.rows.filter((r) => r.action !== "error") ?? [];
  const bad = plan?.rows.filter((r) => r.action === "error") ?? [];

  async function exportProducts() {
    const { data, error } = await getSupabase().from("products").select("*, category:categories(slug)").order("name");
    if (error) return setError(error.message);
    type Row = Record<string, unknown> & { category?: { slug: string } | null; specs?: Record<string, string> | null; images?: string[] | null };
    const yn = (v: unknown) => (v ? "yes" : "no");
    const rows = (data as Row[]).map((p) => [
      p.sku as string, p.name as string, (p.brand as string) ?? "", p.category?.slug ?? "", p.price as number, (p.mrp as number) ?? "", tiersText(p.price_tiers),
      p.stock as number, (p.short_description as string) ?? "", (p.description as string) ?? "",
      Object.entries(p.specs ?? {}).map(([k, v]) => `${k}: ${v}`).join("; "), (p.equivalents as string) ?? "",
      (p.hsn_code as string) ?? "", (p.bis_number as string) ?? "", (p.country_of_origin as string) ?? "", (p.manufacturer as string) ?? "", (p.warranty_months as number) ?? 0,
      yn(p.is_new_arrival), yn(p.ready_to_dispatch), yn(p.is_active), (p.images ?? []).join(" | "),
    ]);
    download(`pcbdukaan-products-${new Date().toISOString().slice(0, 10)}.csv`, toCsv([[...IMPORT_COLUMNS], ...rows]));
  }

  async function readFile(file: File | undefined) {
    setResults(null); setError(null);
    if (!file) return;
    if (/\.xlsx?$/i.test(file.name)) {
      setError("This is an Excel file. In Excel choose File → Save As → “CSV UTF-8”, or in Google Sheets File → Download → CSV, then choose that file.");
      return;
    }
    setFileName(file.name);
    setTable(parseCsv(await file.text()));
  }

  async function run() {
    if (!plan || !ready.length) return;
    setRunning(true); setError(null);
    const supabase = getSupabase();
    const uploaded = new Map<string, string>();     // photo file name → URL (each photo uploads once)
    const files = new Map(photos.map((f) => [f.name, f]));
    const out: Result[] = [];
    for (const [i, row] of ready.entries()) {
      setProgress(`${i + 1} of ${ready.length}: ${row.sku}`);
      try {
        const urls = [...row.photoUrls];
        for (const name of row.photoFiles) {
          if (!uploaded.has(name)) uploaded.set(name, await uploadImage(files.get(name)!));
          urls.push(uploaded.get(name)!);
        }
        const values: Record<string, unknown> = { ...row.values, sku: row.sku, updated_at: new Date().toISOString() };
        if (urls.length) { values.images = urls; values.image_url = urls[0]; }
        const res = row.action === "update"
          ? await supabase.from("products").update(values).eq("id", row.existingId!).select("slug").single()
          : await supabase.from("products").insert(values).select("slug").single();
        if (res.error) throw new Error(
          /duplicate key/.test(res.error.message) ? "Another product already uses this SKU or web address"
          : /column .* does not exist|schema cache/.test(res.error.message) ? `Database update needed for one of the columns (${res.error.message})`
          : res.error.message);
        out.push({ line: row.line, sku: row.sku, ok: true, message: row.action === "update" ? "Updated" : "Added", slug: res.data.slug });
      } catch (e) {
        out.push({ line: row.line, sku: row.sku, ok: false, message: e instanceof Error ? e.message : String(e) });
      }
      setResults([...out]);
    }
    setProgress("Refreshing the shop…");
    await revalidateCatalog(out.filter((r) => r.ok && r.slug).slice(0, 50).map((r) => `/products/${r.slug}`));
    setProgress("");
    setRunning(false);
    setTable(null); setFileName(""); setPhotos([]);
    loadExisting();
  }

  const okCount = results?.filter((r) => r.ok).length ?? 0;
  return (
    <div className="max-w-5xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Bulk upload products</h1>
        <Link href="/admin/products" className="text-sm text-brand-700 hover:underline">← Products</Link>
      </div>
      {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}

      <section className="space-y-3 rounded-md bg-white p-5 ring-1 ring-slate-200">
        <h2 className="font-bold">1. Get the spreadsheet</h2>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => download("pcbdukaan-product-template.csv", toCsv(TEMPLATE_ROWS))} className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">Download empty template</button>
          <button type="button" onClick={exportProducts} className="rounded-md px-4 py-2 text-sm font-semibold ring-1 ring-slate-300 hover:ring-brand-600">Download my current products</button>
        </div>
        <p className="text-sm text-slate-600">
          Open it in Excel or Google Sheets, fill one product per row (delete the 2 example rows), and save as <b>CSV</b>.
          To change prices or stock of many products at once, download your current products, edit, and upload again –
          rows are matched by <b>SKU</b>: an existing SKU is updated, a new SKU is added.
        </p>
        <details className="text-sm">
          <summary className="cursor-pointer font-semibold text-brand-700">Column guide</summary>
          <ul className="mt-2 list-disc space-y-1 ps-5 text-slate-700">
            <li><b>sku</b>, <b>name</b>, <b>category</b>, <b>price</b> – required for new products (price in ₹ before GST, like the product form).</li>
            <li><b>category</b> – one of: {categories.map((c) => <code key={c.id} className="me-1 rounded bg-slate-100 px-1">{c.slug}</code>)}</li>
            <li><b>brand</b> – the real make (Mean Well, Delta, Omron …) helps customers find it on Google.</li>
            <li><b>specs</b> – <code>Voltage: 24 V; Current: 5 A</code> · <b>equivalents</b> – part numbers it replaces.</li>
            <li><b>price_tiers</b> – bulk price breaks, e.g. <code>10:2050; 25:1990</code> (10+ pcs ₹2,050 each, 25+ ₹1,990 each, before GST).</li>
            <li><b>country_of_origin</b> – e.g. India, China, Taiwan · <b>manufacturer</b> – manufacturer / importer name &amp; address (shown on the product page).</li>
            <li><b>new_arrival</b>, <b>ready_to_dispatch</b>, <b>active</b> – yes / no. <b>warranty_months</b>, <b>stock</b> – whole numbers.</li>
            <li><b>photos</b> – photo file names (e.g. <code>MW-EDR-120-24.jpg</code>, several separated by commas, up to 10 per product) or web links. Leave empty and name the photos after the SKU (<code>SKU.jpg</code>, <code>SKU-2.jpg</code>) – they are matched automatically.</li>
            <li>Empty cells don&apos;t change existing products.</li>
          </ul>
        </details>
      </section>

      <section className="space-y-3 rounded-md bg-white p-5 ring-1 ring-slate-200">
        <h2 className="font-bold">2. Choose the file and photos</h2>
        <label className="block text-sm font-medium">Spreadsheet (CSV)
          <input type="file" accept=".csv,text/csv,.xlsx,.xls" onChange={(e) => { readFile(e.target.files?.[0]); e.target.value = ""; }} className={adminField} />
        </label>
        {fileName && <p className="text-xs text-slate-500">Loaded: {fileName}</p>}
        <label className="block text-sm font-medium">Product photos (optional – choose many at once)
          <input type="file" accept="image/*" multiple onChange={(e) => setPhotos(Array.from(e.target.files ?? []))} className={adminField} />
        </label>
        {photos.length > 0 && <p className="text-xs text-slate-500">{photos.length} photos chosen – big phone photos are made smaller automatically.</p>}
      </section>

      {plan && (
        <section className="space-y-3 rounded-md bg-white p-5 ring-1 ring-slate-200">
          <h2 className="font-bold">3. Check and upload</h2>
          {plan.error ? <p className="text-sm text-red-700">{plan.error}</p> : (
            <>
              <p className="text-sm">
                <b className="text-emerald-700">{ready.filter((r) => r.action === "create").length} new</b> ·{" "}
                <b className="text-sky-700">{ready.filter((r) => r.action === "update").length} updates</b> ·{" "}
                <b className={bad.length ? "text-red-700" : "text-slate-500"}>{bad.length} with problems (skipped)</b>
              </p>
              {plan.unknownColumns.length > 0 && <p className="text-xs text-amber-700">Ignored columns: {plan.unknownColumns.join(", ")}</p>}
              <div className="max-h-[28rem] divide-y divide-slate-100 overflow-auto rounded ring-1 ring-slate-200">
                {plan.rows.map((r: PlannedRow) => (
                  <div key={r.line} className={`p-2 text-sm ${r.action === "error" ? "bg-red-50" : ""}`}>
                    <p>
                      <span className="me-2 text-xs text-slate-500">Row {r.line}</span>
                      <span className={`me-2 rounded px-1.5 py-0.5 text-xs font-semibold ${r.action === "create" ? "bg-emerald-100 text-emerald-800" : r.action === "update" ? "bg-sky-100 text-sky-800" : "bg-red-100 text-red-700"}`}>
                        {r.action === "create" ? "New" : r.action === "update" ? "Update" : "Problem"}
                      </span>
                      <b className="font-mono">{r.sku || "—"}</b> {r.name}
                    </p>
                    {r.errors.length > 0 && <p className="text-xs text-red-700">{r.errors.join(" · ")}</p>}
                    {r.action !== "error" && (
                      <p className="text-xs text-slate-500">
                        {typeof r.values?.price === "number" && <>₹{r.values.price as number} · </>}
                        {r.photoFiles.length + r.photoUrls.length > 0 ? `${r.photoFiles.length + r.photoUrls.length} photo(s)` : r.action === "update" ? "photos unchanged" : "no photo"}
                        {r.missingPhotos.length > 0 && <span className="text-amber-700"> · not among chosen photos: {r.missingPhotos.join(", ")}</span>}
                      </p>
                    )}
                  </div>
                ))}
              </div>
              <button type="button" disabled={running || !ready.length} onClick={run} className="rounded-md bg-brand-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-60">
                {running ? progress || "Uploading…" : `Upload ${ready.length} product${ready.length === 1 ? "" : "s"}`}
              </button>
            </>
          )}
        </section>
      )}

      {results && (
        <section className="space-y-2 rounded-md bg-white p-5 ring-1 ring-slate-200">
          <h2 className="font-bold">Result: {okCount} saved{results.length - okCount ? `, ${results.length - okCount} failed` : ""}</h2>
          {running && <p className="text-sm text-slate-500">{progress}</p>}
          <ul className="max-h-80 space-y-1 overflow-auto text-sm">
            {results.map((r) => (
              <li key={r.line} className={r.ok ? "text-emerald-800" : "text-red-700"}>
                {r.ok ? "✓" : "✕"} Row {r.line} <b className="font-mono">{r.sku}</b> – {r.message}
                {r.ok && r.slug && <> · <a href={`/products/${r.slug}`} target="_blank" rel="noopener noreferrer" className="text-brand-700 hover:underline">view</a></>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
