"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase-browser";
import { adminButton, adminField, revalidateCatalog, uploadImage } from "@/lib/admin";
import type { Banner } from "@/lib/types";

const THEME_SWATCH: Record<Banner["theme"], string> = {
  blue: "bg-brand-700", orange: "bg-accent-500", dark: "bg-slate-900", green: "bg-emerald-700",
};

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<Banner[] | null>(null);
  const [editing, setEditing] = useState<Banner | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data } = await getSupabase().from("banners").select("*").order("sort_order");
    setBanners((data as Banner[]) ?? []);
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount
    load();
  }, [load]);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setSaving(true);
    let image_url = editing && editing !== "new" ? editing.image_url : null;
    try {
      const file = f.get("image") as File | null;
      if (file && file.size > 0) image_url = await uploadImage(file, "banners");
    } catch (err) {
      setSaving(false);
      return setError(err instanceof Error ? err.message : "Upload failed");
    }
    if (f.get("remove_image") === "on") image_url = null;
    const link = String(f.get("link")).trim() || "/products";
    const values = {
      title: String(f.get("title")).trim(),
      subtitle: String(f.get("subtitle")).trim() || null,
      cta_label: String(f.get("cta_label")).trim() || "Shop now",
      link: link.startsWith("/") || /^https?:\/\//.test(link) ? link : `/${link}`,
      theme: String(f.get("theme")),
      sort_order: Number(f.get("sort_order")) || 0,
      is_active: f.get("is_active") === "on",
      image_url,
    };
    const supabase = getSupabase();
    const { error } = editing && editing !== "new"
      ? await supabase.from("banners").update(values).eq("id", editing.id)
      : await supabase.from("banners").insert(values);
    setSaving(false);
    if (error) return setError(error.message);
    setError(null);
    setEditing(null);
    revalidateCatalog();
    load();
  }

  async function remove(b: Banner) {
    if (!confirm(`Delete banner “${b.title}”?`)) return;
    await getSupabase().from("banners").delete().eq("id", b.id);
    revalidateCatalog();
    load();
  }

  const current = editing && editing !== "new" ? editing : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Home page banners</h1>
        {editing === null && <button onClick={() => setEditing("new")} className={adminButton}>+ Add banner</button>}
      </div>
      <p className="text-sm text-slate-600">These rotate in the big slider at the top of the home page. Use an image around 1600 × 500 px, or leave it empty for a coloured banner.</p>
      {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {editing !== null && (
        <form key={current?.id ?? "new"} onSubmit={save} className="grid gap-4 rounded-md bg-white p-5 ring-1 ring-slate-200 sm:grid-cols-2">
          <label className="text-sm font-medium sm:col-span-2">Title *<input name="title" required defaultValue={current?.title} className={adminField} /></label>
          <label className="text-sm font-medium sm:col-span-2">Subtitle<input name="subtitle" defaultValue={current?.subtitle ?? ""} className={adminField} /></label>
          <label className="text-sm font-medium">Button text<input name="cta_label" defaultValue={current?.cta_label ?? "Shop now"} className={adminField} /></label>
          <label className="text-sm font-medium">Button link<input name="link" defaultValue={current?.link ?? "/products"} placeholder="/category/drone-parts" className={adminField} /></label>
          <label className="text-sm font-medium">Colour (when no image)
            <select name="theme" defaultValue={current?.theme ?? "blue"} className={adminField}>
              <option value="blue">Blue</option><option value="orange">Orange</option><option value="dark">Dark</option><option value="green">Green</option>
            </select>
          </label>
          <label className="text-sm font-medium">Sort order<input name="sort_order" type="number" defaultValue={current?.sort_order ?? (banners?.length ?? 0) + 1} className={adminField} /></label>
          <label className="text-sm font-medium">Background image<input name="image" type="file" accept="image/*" className={adminField} /></label>
          <div className="flex flex-col justify-end gap-2 text-sm">
            {current?.image_url && <label className="flex items-center gap-2"><input type="checkbox" name="remove_image" className="h-4 w-4" />Remove current image</label>}
            <label className="flex items-center gap-2"><input type="checkbox" name="is_active" defaultChecked={current?.is_active ?? true} className="h-4 w-4 accent-brand-600" />Show on home page</label>
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <button disabled={saving} className={adminButton}>{saving ? "Saving…" : "Save"}</button>
            <button type="button" onClick={() => setEditing(null)} className="rounded-md px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
          </div>
        </form>
      )}
      <ul className="grid gap-4 sm:grid-cols-2">
        {banners === null && <li className="text-sm text-slate-500">Loading…</li>}
        {banners?.map((b) => (
          <li key={b.id} className={`overflow-hidden rounded-md bg-white ring-1 ring-slate-200 ${b.is_active ? "" : "opacity-60"}`}>
            <div className={`relative flex h-32 items-end p-4 text-white ${THEME_SWATCH[b.theme]}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {b.image_url && <img src={b.image_url} alt="" className="absolute inset-0 h-full w-full object-cover" />}
              <p className="relative text-lg font-bold drop-shadow">{b.title}</p>
            </div>
            <div className="flex items-center justify-between gap-2 p-3 text-xs">
              <span className="text-slate-500">#{b.sort_order} · {b.link} {b.is_active ? "" : "· hidden"}</span>
              <span className="font-semibold">
                <button onClick={() => setEditing(b)} className="text-brand-700 hover:underline">Edit</button>
                <button onClick={() => remove(b)} className="ml-3 text-red-600 hover:underline">Delete</button>
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
