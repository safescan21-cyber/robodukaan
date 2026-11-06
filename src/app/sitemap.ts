import type { MetadataRoute } from "next";
import { getCategories, getProducts } from "@/lib/data";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://pcbdukaan.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, { products }] = await Promise.all([getCategories(), getProducts({ pageSize: 60, sort: "newest" })]);
  const pages = ["", "/products", "/pcb-repair", "/about", "/contact", "/shipping-returns", "/privacy", "/careers"].map((p) => ({
    url: `${SITE}${p}`,
    changeFrequency: "weekly" as const,
    priority: p === "" ? 1 : p === "/pcb-repair" || p === "/products" ? 0.9 : 0.4,
  }));
  return [
    ...pages,
    ...categories.map((c) => ({ url: `${SITE}/category/${c.slug}`, changeFrequency: "weekly" as const, priority: 0.8 })),
    ...products.map((p) => ({ url: `${SITE}/products/${p.slug}`, lastModified: p.created_at, changeFrequency: "weekly" as const, priority: 0.7 })),
  ];
}
