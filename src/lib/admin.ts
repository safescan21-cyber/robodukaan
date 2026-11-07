"use client";

import { getSupabase } from "./supabase-browser";

// Tell the server to refresh cached catalog pages after an admin change.
// paths: pages that changed (e.g. "/products/x"); search engines are told about them via IndexNow.
export async function revalidateCatalog(paths: string[] = []) {
  const { data } = await getSupabase().auth.getSession();
  const token = data.session?.access_token;
  if (!token) return;
  await fetch("/api/revalidate", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ paths }),
  }).catch(() => {});
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

// Upload a video (MP4 / WebM / MOV, up to 50 MB) to the same public bucket.
export async function uploadVideo(file: File, folder = "videos"): Promise<string> {
  if (!file.type.startsWith("video/")) throw new Error("Please choose a video file (MP4 or WebM).");
  if (file.size > 50 * 1024 * 1024) throw new Error("Videos must be under 50 MB. Try a shorter clip or lower resolution.");
  const ext = (file.name.split(".").pop() || "mp4").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const supabase = getSupabase();
  const { error } = await supabase.storage.from("product-images").upload(path, file, { cacheControl: "31536000", upsert: false, contentType: file.type });
  if (error) throw new Error(error.message);
  return supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
}

// Technical data files (datasheets, manuals, drawings) → public "product-docs" bucket (migration 010).
const DOC_EXTENSIONS = ["pdf", "doc", "docx", "xls", "xlsx", "zip", "png", "jpg", "jpeg", "webp", "txt", "csv", "dwg", "dxf", "step", "stp"];
export const DOC_ACCEPT = DOC_EXTENSIONS.map((e) => `.${e}`).join(",");

export async function uploadDocument(file: File, folder = "products"): Promise<{ name: string; url: string; size: number; type: string }> {
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  if (!DOC_EXTENSIONS.includes(ext)) throw new Error(`"${file.name}": allowed files are ${DOC_EXTENSIONS.join(", ").toUpperCase()}.`);
  if (file.size > 25 * 1024 * 1024) throw new Error(`"${file.name}" is larger than 25 MB.`);
  const base = file.name.slice(0, -(ext.length + 1));
  const safe = base.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "file";
  const path = `${folder}/${Date.now()}-${safe}.${ext}`;
  const supabase = getSupabase();
  const { error } = await supabase.storage.from("product-docs").upload(path, file, {
    cacheControl: "86400", upsert: false, contentType: file.type || "application/octet-stream",
  });
  if (error) {
    throw new Error(/bucket not found/i.test(error.message)
      ? "File storage isn't set up yet: run supabase/migrations/RUN-IN-SUPABASE.sql (update 010) in Supabase."
      : error.message);
  }
  return { name: base.replace(/[_-]+/g, " ").trim() || file.name, url: supabase.storage.from("product-docs").getPublicUrl(path).data.publicUrl, size: file.size, type: ext };
}

export const adminField =
  "mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100";
export const adminButton =
  "rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60";
