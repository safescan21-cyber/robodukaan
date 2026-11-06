"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase-browser";
import { adminButton, adminField, revalidateCatalog, uploadImage } from "@/lib/admin";
import { CATEGORY_ICONS } from "@/lib/constants";
import { slugify } from "@/lib/format";
import { CategoryIcon } from "@/components/CategoryIcon";
import type { Category } from "@/lib/types";

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [editing, setEditing] = useState<Category | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await getSupabase().from("categories").select("*").order("sort_order");
    setCategories((data as Category[]) ?? []);
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount
    load();
  }, [load]);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = String(f.get("name")).trim();
    let image_url = editing && editing !== "new" ? editing.image_url : null;
    const file = f.get("image") as File | null;
    try {
      if (file && file.size > 0) image_url = await uploadImage(file, "categories");
    } catch (err) {
      return setError(err instanceof Error ? err.message : "Upload failed");
    }
    if (f.get("remove_image") === "on") image_url = null;
    const values = {
      name,
      slug: slugify(String(f.get("slug")) || name),
      description: String(f.get("description")).trim() || null,
      icon: String(f.get("icon")),
      sort_order: Number(f.get("sort_order")) || 0,
      image_url,
    };
    const supabase = getSupabase();
    const { error } = editing && editing !== "new"
      ? await supabase.from("categories").update(values).eq("id", editing.id)
      : await supabase.from("categories").insert(values);
    if (error) return setError(error.message.includes("duplicate") ? "That slug is already used." : error.message);
    setError(null);
    setEditing(null);
    revalidateCatalog();
    load();
  }

  async function remove(c: Category) {
    if (!confirm(`Delete category “${c.name}”?`)) return;
    const { error } = await getSupabase().from("categories").delete().eq("id", c.id);
    if (error) setError(error.message.includes("foreign key") ? "Move or delete this category's products first." : error.message);
    else {
      revalidateCatalog();
      load();
    }
  }

  const current = editing && editing !== "new" ? editing : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Categories</h1>
        {editing === null && <button onClick={() => setEditing("new")} className={adminButton}>+ Add category</button>}
      </div>
      {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {editing !== null && (
        <form key={current?.id ?? "new"} onSubmit={save} className="grid gap-4 rounded-md bg-white p-5 ring-1 ring-slate-200 sm:grid-cols-2">
          <label className="text-sm font-medium">Name *<input name="name" required defaultValue={current?.name} className={adminField} /></label>
          <label className="text-sm font-medium">URL slug<input name="slug" defaultValue={current?.slug} placeholder="auto from name" className={adminField} /></label>
          <label className="text-sm font-medium sm:col-span-2">Description<input name="description" defaultValue={current?.description ?? ""} className={adminField} /></label>
          <label className="text-sm font-medium">Icon
            <select name="icon" defaultValue={current?.icon ?? "chip"} className={adminField}>
              {CATEGORY_ICONS.map((i) => <option key={i}>{i}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium">Sort order<input name="sort_order" type="number" defaultValue={current?.sort_order ?? (categories?.length ?? 0) + 1} className={adminField} /></label>
          <label className="text-sm font-medium">Image (optional, replaces the icon)<input name="image" type="file" accept="image/*" className={adminField} /></label>
          {current?.image_url && <label className="flex items-center gap-2 self-end text-sm"><input type="checkbox" name="remove_image" className="h-4 w-4" />Remove current image</label>}
          <div className="flex gap-2 sm:col-span-2">
            <button className={adminButton}>Save</button>
            <button type="button" onClick={() => setEditing(null)} className="rounded-md px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
          </div>
        </form>
      )}
      <ul className="divide-y divide-slate-100 rounded-md bg-white ring-1 ring-slate-200">
        {categories === null && <li className="p-4 text-sm text-slate-500">Loading…</li>}
        {categories?.map((c) => (
          <li key={c.id} className="flex items-center gap-4 px-4 py-3 text-sm">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-50 text-brand-600">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {c.image_url ? <img src={c.image_url} alt="" className="h-full w-full object-cover" /> : <CategoryIcon name={c.icon} className="h-5 w-5" />}
            </span>
            <span className="flex-1"><span className="font-semibold">{c.name}</span><span className="block text-xs text-slate-500">/{c.slug} · order {c.sort_order}</span></span>
            <button onClick={() => setEditing(c)} className="text-xs font-semibold text-brand-700 hover:underline">Edit</button>
            <button onClick={() => remove(c)} className="text-xs font-semibold text-red-600 hover:underline">Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
