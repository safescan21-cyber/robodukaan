import "server-only";
import { LOCALES, localizePath } from "@/i18n/config";

// IndexNow (Bing, Yandex, Seznam, Naver …): tell search engines right away that pages changed.
// The key is public on purpose – it's served at /6ff10b478d894a90e903df17255f438f.txt to prove the site is ours.
const KEY = "6ff10b478d894a90e903df17255f438f";
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://pcbdukaan.com";

// Sends the given paths (e.g. "/products/x") in every language. Never throws.
export async function pingIndexNow(paths: string[]) {
  if (!paths.length || !SITE.startsWith("https://")) return false;
  const host = new URL(SITE).host;
  const urlList = [...new Set(paths.flatMap((p) => LOCALES.map((l) => `${SITE}${localizePath(p, l) === "/" ? "" : localizePath(p, l)}`)))].slice(0, 10000);
  try {
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ host, key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList }),
      signal: AbortSignal.timeout(10000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
