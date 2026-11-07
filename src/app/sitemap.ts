import type { MetadataRoute } from "next";
import { getAllProductLinks, getCategories, getOpenJobs } from "@/lib/data";
import { AREAS, STATES } from "@/lib/locations";
import { DRIVE_BRANDS } from "@/lib/fault-codes";
import { REPAIR_SERVICES } from "@/lib/seo-content";
import { languageAlternates } from "@/i18n/config";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://pcbdukaan.com";

// Translated pages list every language version (location pages are English only).
function langs(path: string) {
  const out: Record<string, string> = {};
  for (const [tag, href] of Object.entries(languageAlternates(path || "/"))) out[tag] = `${SITE}${href === "/" ? "" : href}`;
  return { languages: out };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, products, jobs] = await Promise.all([getCategories(), getAllProductLinks(), getOpenJobs()]);
  const pages = ["", "/products", "/pcb-repair", "/careers", "/about", "/contact", "/shipping-returns", "/privacy", "/track", "/site-map", "/locations", "/bulk-quote", "/replacement-finder", "/fault-codes"].map((p) => ({
    url: `${SITE}${p}`,
    changeFrequency: "weekly" as const,
    priority: p === "" ? 1 : p === "/pcb-repair" || p === "/products" ? 0.9 : 0.4,
    ...(p === "/locations" || p === "/fault-codes" ? {} : { alternates: langs(p) }),
  }));
  return [
    ...pages,
    ...categories.map((c) => ({ url: `${SITE}/category/${c.slug}`, changeFrequency: "weekly" as const, priority: 0.8, alternates: langs(`/category/${c.slug}`) })),
    ...products.map((p) => ({ url: `${SITE}/products/${p.slug}`, lastModified: p.created_at, changeFrequency: "weekly" as const, priority: 0.7, alternates: langs(`/products/${p.slug}`) })),
    ...STATES.map((s) => ({ url: `${SITE}/locations/${s.slug}`, changeFrequency: "monthly" as const, priority: 0.6 })),
    ...REPAIR_SERVICES.map((r) => ({ url: `${SITE}/pcb-repair/${r.slug}`, changeFrequency: "monthly" as const, priority: 0.8 })),
    ...DRIVE_BRANDS.map((b) => ({ url: `${SITE}/fault-codes/${b.slug}`, changeFrequency: "monthly" as const, priority: 0.6 })),
    ...AREAS.map((x) => ({ url: `${SITE}/locations/${x.state}/${x.slug}`, changeFrequency: "monthly" as const, priority: 0.5 })),
    ...jobs.map((j) => ({ url: `${SITE}/careers/${j.slug}`, lastModified: j.created_at, changeFrequency: "weekly" as const, priority: 0.5, alternates: langs(`/careers/${j.slug}`) })),
  ];
}
