"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase-browser";
import { adminField, revalidateCatalog, uploadImage } from "@/lib/admin";
import { formatDate, slugify } from "@/lib/format";
import { REPAIR_SERVICES } from "@/lib/seo-content";
import type { CaseStudy } from "@/lib/types";

// Admin → Case studies: write up real repair jobs (fault → diagnosis → repair → result, with photos).
// Published ones appear on /repair-case-studies and on the matching repair service page.
export default function CaseStudiesAdmin() {
  const [rows, setRows] = useState<CaseStudy[] | null>(null);
  const [editing, setEditing] = useState<CaseStudy | "new" | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await getSupabase().from("case_studies").select("*").order("created_at", { ascending: false });
    setError(error ? (/case_studies/.test(error.message) ? "Run database update 018 (supabase/migrations/RUN-IN-SUPABASE.sql) in Supabase first." : error.message) : null);
    setRows((data as CaseStudy[]) ?? []);
  }, []);
  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  function open(c: CaseStudy | "new") {
    setEditing(c);
    setPhotos(c === "new" ? [] : c.photos);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function addPhotos(list: FileList | null) {
    if (!list?.length) return;
    setUploading(true);
    try {
      for (const f of Array.from(list).slice(0, 8 - photos.length)) {
        const url = await uploadImage(f, "cases");
        setPhotos((p) => [...p, url]);
      }
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    setUploading(false);
  }

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? "").trim();
    const current = editing && editing !== "new" ? editing : null;
    const publish = f.get("is_published") === "on";
    const days = get("turnaround_days");
    const values = {
      title: get("title"),
      slug: slugify(get("slug") || get("title")).slice(0, 80),
      board_type: get("board_type") || null,
      brand_model: get("brand_model") || null,
      industry: get("industry") || null,
      city: get("city") || null,
      fault: get("fault"),
      diagnosis: get("diagnosis") || null,
      repair: get("repair"),
      result: get("result") || null,
      turnaround_days: days === "" ? null : Number(days),
      saving_note: get("saving_note") || null,
      service_slug: get("service_slug") || null,
      photos,
      is_published: publish,
      published_at: publish ? current?.published_at ?? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };
    setSaving(true);
    const supabase = getSupabase();
    const { error } = current
      ? await supabase.from("case_studies").update(values).eq("id", current.id)
      : await supabase.from("case_studies").insert(values);
    setSaving(false);
    if (error) return setError(/duplicate key/.test(error.message) ? "Another case study already uses this web address – change the title or slug." : error.message);
    await revalidateCatalog(publish ? [`/repair-case-studies/${values.slug}`, "/repair-case-studies"] : []);
    setEditing(null);
    load();
  }

  const c = editing && editing !== "new" ? editing : null;
  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Repair case studies</h1>
        <button onClick={() => open("new")} className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">+ New case study</button>
      </div>
      <p className="text-sm text-slate-600">
        Write up real repairs you did – the fault, what you found, what you replaced and the result, with before/after photos.
        They show on <a href="/repair-case-studies" target="_blank" className="text-brand-700 hover:underline">/repair-case-studies</a> and
        help customers trust you and Google find you. Only describe real jobs, and don&apos;t name a customer without their permission.
      </p>
      {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}

      {editing && (
        <form key={c?.id ?? "new"} onSubmit={save} className="space-y-3 rounded-md bg-white p-5 ring-1 ring-slate-200">
          <h2 className="font-bold">{c ? "Edit case study" : "New case study"}</h2>
          <label className="block text-sm font-medium">Title *<input name="title" required minLength={5} maxLength={160} defaultValue={c?.title ?? ""} placeholder="Delta VFD-M 2.2 kW with OC fault – IGBT and gate driver repair" className={adminField} /></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium">Board type<input name="board_type" maxLength={80} defaultValue={c?.board_type ?? ""} placeholder="VFD / AC drive" className={adminField} /></label>
            <label className="text-sm font-medium">Brand & model<input name="brand_model" maxLength={120} defaultValue={c?.brand_model ?? ""} placeholder="Delta VFD022M43B" className={adminField} /></label>
            <label className="text-sm font-medium">Industry<input name="industry" maxLength={80} defaultValue={c?.industry ?? ""} placeholder="Textile mill" className={adminField} /></label>
            <label className="text-sm font-medium">City<input name="city" maxLength={80} defaultValue={c?.city ?? ""} placeholder="Surat" className={adminField} /></label>
            <label className="text-sm font-medium">Repair service page
              <select name="service_slug" defaultValue={c?.service_slug ?? ""} className={adminField}>
                <option value="">— none —</option>
                {REPAIR_SERVICES.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium">Turnaround (working days)<input name="turnaround_days" type="number" min={0} max={365} defaultValue={c?.turnaround_days ?? ""} className={adminField} /></label>
          </div>
          <label className="block text-sm font-medium">Fault reported *<textarea name="fault" required rows={2} maxLength={3000} defaultValue={c?.fault ?? ""} placeholder="Drive tripped with OC at start; no output to the motor." className={adminField} /></label>
          <label className="block text-sm font-medium">What we found<textarea name="diagnosis" rows={3} maxLength={5000} defaultValue={c?.diagnosis ?? ""} placeholder="Two shorted IGBTs in the W phase, damaged gate resistor, dried DC-bus capacitors." className={adminField} /></label>
          <label className="block text-sm font-medium">What we repaired *<textarea name="repair" required rows={3} maxLength={5000} defaultValue={c?.repair ?? ""} placeholder="Replaced the IGBT module and gate driver parts, new DC-bus capacitors, load-tested with a 2.2 kW motor for 2 hours." className={adminField} /></label>
          <label className="block text-sm font-medium">Result<textarea name="result" rows={2} maxLength={3000} defaultValue={c?.result ?? ""} placeholder="Machine back in production; customer saved buying a new drive." className={adminField} /></label>
          <label className="block text-sm font-medium">Saving (optional)<input name="saving_note" maxLength={300} defaultValue={c?.saving_note ?? ""} placeholder="Repair cost about a third of a new drive" className={adminField} /></label>
          <div>
            <p className="text-sm font-medium">Photos (before / after, up to 8)</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {photos.map((p, i) => (
                <div key={p} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p} alt="" className="h-20 w-20 rounded object-cover ring-1 ring-slate-200" />
                  <button type="button" onClick={() => setPhotos((x) => x.filter((_, j) => j !== i))} className="absolute -end-1 -top-1 rounded-full bg-red-600 px-1.5 text-xs text-white" aria-label="Remove photo">×</button>
                </div>
              ))}
              {photos.length < 8 && (
                <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded border-2 border-dashed border-slate-300 text-xs text-slate-500">
                  {uploading ? "…" : "+ Photo"}
                  <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { addPhotos(e.target.files); e.target.value = ""; }} />
                </label>
              )}
            </div>
          </div>
          <details className="text-sm"><summary className="cursor-pointer text-slate-600">Web address</summary>
            <label className="mt-2 block text-sm font-medium">Slug<input name="slug" pattern="[a-z0-9-]+" defaultValue={c?.slug ?? ""} placeholder="made from the title" className={adminField} /></label>
          </details>
          <label className="flex items-center gap-2 text-sm font-medium"><input name="is_published" type="checkbox" defaultChecked={c?.is_published ?? true} /> Published (visible on the website)</label>
          <div className="flex gap-2">
            <button disabled={saving || uploading} className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">{saving ? "Saving…" : "Save"}</button>
            <button type="button" onClick={() => setEditing(null)} className="rounded-md px-4 py-2 text-sm ring-1 ring-slate-300">Cancel</button>
          </div>
        </form>
      )}

      {rows === null && <div className="h-32 animate-pulse rounded-md bg-slate-100" />}
      {rows?.length === 0 && !editing && <p className="text-sm text-slate-500">No case studies yet. After your next repair, take before/after photos and write it up here.</p>}
      <div className="space-y-2">
        {rows?.map((r) => (
          <div key={r.id} className="flex flex-wrap items-start justify-between gap-2 rounded-md bg-white p-4 ring-1 ring-slate-200">
            <div className="text-sm">
              <p className="font-bold">{r.title}</p>
              <p className="text-xs text-slate-500">{r.is_published ? `Published ${r.published_at ? formatDate(r.published_at) : ""}` : "Draft"} · {r.photos.length} photo(s)</p>
            </div>
            <div className="flex gap-3 text-sm">
              {r.is_published && <a href={`/repair-case-studies/${r.slug}`} target="_blank" rel="noopener noreferrer" className="text-brand-700 hover:underline">View</a>}
              <button onClick={() => open(r)} className="font-semibold text-brand-700 hover:underline">Edit</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
