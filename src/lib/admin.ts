"use client";

import { getSupabase } from "./supabase-browser";

// Tell the server to refresh cached catalog pages after an admin change.
export async function revalidateCatalog() {
  const { data } = await getSupabase().auth.getSession();
  const token = data.session?.access_token;
  if (!token) return;
  await fetch("/api/revalidate", { method: "POST", headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
}

// Upload an image to the public "product-images" bucket and return its URL.
export async function uploadImage(file: File, folder = "products"): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Images must be under 5 MB.");
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const supabase = getSupabase();
  const { error } = await supabase.storage.from("product-images").upload(path, file, { cacheControl: "31536000", upsert: false });
  if (error) throw new Error(error.message);
  return supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
}

export const adminField =
  "mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100";
export const adminButton =
  "rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60";
