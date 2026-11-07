import "server-only";
import { LOCALES, localizePath } from "@/i18n/config";

// IndexNow (Bing, Yandex, Seznam, Naver …): tell search engines right away that pages changed.
// The key is public on purpose – it's served at /6ff10b478d894a90e903df17255f438f.txt to prove the site is ours.
const KEY = "6ff10b478d894a90e903df17255f438f";
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://pcbdukaan.com";

// Sends the given paths (e.g. "/products/x") in every language. Never throws.
export async function pingIndexNow(paths: string[]) {
  return submitUrls(paths.flatMap((p) => LOCALES.map((l) => `${SITE}${localizePath(p, l) === "/" ? "" : localizePath(p, l)}`)));
}

// Every page in the sitemap, including each language version. Returns how many were sent (0 = failed).
export async function submitWholeSite() {
  try {
    const xml = await (await fetch(`${SITE}/sitemap.xml`, { signal: AbortSignal.timeout(20000) })).text();
    const urls = [...xml.matchAll(/(?:<loc>|hreflang="[^"]+" href=")([^<"]+)/g)].map((m) => m[1]).filter((u) => u.startsWith(SITE));
    const unique = [...new Set(urls)];
    return (await submitUrls(unique)) ? unique.length : 0;
  } catch {
    return 0;
  }
}

async function submitUrls(urls: string[]) {
  if (!urls.length || !SITE.startsWith("https://")) return false;
  const host = new URL(SITE).host;
  const urlList = [...new Set(urls)].slice(0, 10000);
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
