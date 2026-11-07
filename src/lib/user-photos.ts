"use client";

import { getSupabase } from "./supabase-browser";

// Customer photos (profile photo, review photos) → public "user-uploads" bucket, in the
// customer's own folder (<user id>/…), which is all the storage rules allow (migration 013).
// Phone photos are often 5–12 MB: they're shrunk in the browser first (max 1600 px, JPEG).

const MAX_SIDE = 1600;

export async function shrink(file: File, maxSide = MAX_SIDE): Promise<Blob> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error("Please choose a JPG, PNG or WebP photo.");
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size <= 1.5 * 1024 * 1024) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    if (!blob) throw new Error("resize failed");
    return blob;
  } catch {
    if (file.size > 5 * 1024 * 1024) throw new Error("This photo is too large (max 5 MB).");
    return file;
  }
}

export async function uploadUserPhoto(file: File, userId: string, folder: "avatar" | "reviews", maxSide?: number): Promise<string> {
  const blob = await shrink(file, maxSide);
  const ext = blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";
  const path = `${userId}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const supabase = getSupabase();
  const { error } = await supabase.storage.from("user-uploads").upload(path, blob, { cacheControl: "31536000", upsert: false, contentType: blob.type || "image/jpeg" });
  if (error) {
    throw new Error(/bucket not found/i.test(error.message)
      ? "Photo uploads aren't switched on yet (database update 013)."
      : error.message);
  }
  return supabase.storage.from("user-uploads").getPublicUrl(path).data.publicUrl;
}

// Removes a file this customer uploaded earlier (e.g. the old profile photo). Errors are ignored.
export async function removeUserPhoto(url: string | null | undefined) {
  const path = url?.split("/user-uploads/")[1];
  if (path) await getSupabase().storage.from("user-uploads").remove([decodeURIComponent(path)]).then(() => {}, () => {});
}
