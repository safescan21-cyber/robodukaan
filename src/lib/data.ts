import { cacheLife, cacheTag } from "next/cache";
import { supabase } from "./supabase";
import type { Banner, Category, Product } from "./types";

// Server-side catalog reads, cached for a minute and refreshed immediately
// when an admin saves something (see app/api/revalidate/route.ts).

const PRODUCT_FIELDS = "*, category:categories(*)";
const CARD_FIELDS =
  "id, slug, sku, name, brand, category_id, short_description, price, mrp, stock, image_url, images, rating_avg, rating_count, sold_count, is_featured, is_active, created_at, category:categories(slug, name, icon)";

function normalize(rows: unknown[] | null): Product[] {
  return ((rows ?? []) as Product[]).map((p) => ({
    ...p,
    price: Number(p.price),
    mrp: p.mrp == null ? null : Number(p.mrp),
    rating_avg: Number(p.rating_avg ?? 0),
    images: p.images ?? [],
    videos: p.videos ?? [],
    specs: p.specs ?? {},
    faqs: p.faqs ?? [],
    documents: p.documents ?? [],
  }));
}

function logError(where: string, error: { message: string } | null) {
  if (error) console.error(`[supabase] ${where}: ${error.message}`);
}

export async function getCategories(): Promise<Category[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog");
  const { data, error } = await supabase
    .from("categories")
    .select("id, slug, name, description, icon, image_url, sort_order")
    .order("sort_order");
  logError("getCategories", error);
  return data ?? [];
}

export async function getCategory(slug: string): Promise<Category | null> {
  const categories = await getCategories();
  return categories.find((c) => c.slug === slug) ?? null;
}

export async function getBanners(): Promise<Banner[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog");
  const { data, error } = await supabase.from("banners").select("*").eq("is_active", true).order("sort_order");
  logError("getBanners", error);
  return (data ?? []) as Banner[];
}

export type ProductSort = "popular" | "best-selling" | "rating" | "price-asc" | "price-desc" | "newest";

export type ProductQuery = {
  q?: string;
  category?: string;
  sort?: ProductSort;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  featured?: boolean;
  page?: number;
  pageSize?: number;
};

export async function getProducts(query: ProductQuery = {}): Promise<{ products: Product[]; total: number }> {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog");

  const pageSize = Math.min(query.pageSize ?? 24, 60);
  const page = Math.max(1, query.page ?? 1);
  let request = supabase.from("products").select(CARD_FIELDS, { count: "exact" }).eq("is_active", true);

  if (query.category) {
    const category = await getCategory(query.category);
    if (!category) return { products: [], total: 0 };
    request = request.eq("category_id", category.id);
  }

  const q = query.q?.trim().replace(/[%,()*\\]/g, " ").slice(0, 60);
  if (q) {
    request = request.or(
      `name.ilike.%${q}%,brand.ilike.%${q}%,short_description.ilike.%${q}%,sku.ilike.%${q}%`,
    );
  }
  if (query.minPrice != null) request = request.gte("price", query.minPrice);
  if (query.maxPrice != null) request = request.lte("price", query.maxPrice);
  if (query.inStock) request = request.gt("stock", 0);
  if (query.featured) request = request.eq("is_featured", true);

  switch (query.sort) {
    case "price-asc":
      request = request.order("price", { ascending: true });
      break;
    case "price-desc":
      request = request.order("price", { ascending: false });
      break;
    case "newest":
      request = request.order("created_at", { ascending: false });
      break;
    case "best-selling":
      request = request.order("sold_count", { ascending: false }).order("name");
      break;
    case "rating":
      request = request.order("rating_avg", { ascending: false }).order("rating_count", { ascending: false });
      break;
    default:
      request = request.order("is_featured", { ascending: false }).order("sold_count", { ascending: false }).order("name");
  }

  const from = (page - 1) * pageSize;
  const { data, error, count } = await request.range(from, from + pageSize - 1);
  logError("getProducts", error);
  return { products: normalize(data), total: count ?? 0 };
}

export async function getProductRow(sort: ProductSort, opts: { category?: string; featured?: boolean; limit?: number } = {}) {
  const { products } = await getProducts({ sort, category: opts.category, featured: opts.featured, pageSize: opts.limit ?? 10 });
  return products;
}

export async function getProduct(slug: string): Promise<Product | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog");
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_FIELDS)
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  logError("getProduct", error);
  return data ? normalize([data])[0] : null;
}

export async function getRelatedProducts(product: Product, limit = 5): Promise<Product[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog");
  const { data, error } = await supabase
    .from("products")
    .select(CARD_FIELDS)
    .eq("category_id", product.category_id)
    .eq("is_active", true)
    .neq("id", product.id)
    .order("sold_count", { ascending: false })
    .limit(limit);
  logError("getRelatedProducts", error);
  return normalize(data);
}

export async function getOpenJobs(): Promise<import("./types").Job[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog");
  const { data, error } = await supabase.from("jobs").select("*").eq("is_open", true).order("created_at", { ascending: false });
  logError("getOpenJobs", error);
  return data ?? [];
}

export async function getJob(slug: string): Promise<import("./types").Job | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog");
  const { data, error } = await supabase.from("jobs").select("*").eq("slug", slug).eq("is_open", true).maybeSingle();
  logError("getJob", error);
  return data ?? null;
}

// Every active product (slug, name, category) for the sitemaps.
export async function getAllProductLinks(): Promise<{ slug: string; name: string; category_id: number; created_at: string }[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog");
  const { data, error } = await supabase
    .from("products")
    .select("slug, name, category_id, created_at")
    .eq("is_active", true)
    .order("name")
    .limit(5000);
  logError("getAllProductLinks", error);
  return data ?? [];
}
