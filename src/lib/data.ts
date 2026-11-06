import { cacheLife, cacheTag } from "next/cache";
import { supabase } from "./supabase";
import type { Category, Product } from "./types";

const PRODUCT_FIELDS =
  "id, slug, sku, name, brand, category_id, short_description, description, price, mrp, stock, image_url, specs, is_featured, category:categories(slug, name, icon)";

function normalize(rows: unknown[] | null): Product[] {
  return ((rows ?? []) as Product[]).map((p) => ({
    ...p,
    price: Number(p.price),
    mrp: p.mrp == null ? null : Number(p.mrp),
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
    .select("id, slug, name, description, icon, sort_order")
    .order("sort_order");
  logError("getCategories", error);
  return data ?? [];
}

export async function getCategory(slug: string): Promise<Category | null> {
  const categories = await getCategories();
  return categories.find((c) => c.slug === slug) ?? null;
}

export async function getFeaturedProducts(limit = 8): Promise<Product[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog");
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_FIELDS)
    .eq("is_featured", true)
    .order("created_at", { ascending: false })
    .limit(limit);
  logError("getFeaturedProducts", error);
  return normalize(data);
}

export type ProductQuery = {
  q?: string;
  category?: string;
  sort?: "popular" | "price-asc" | "price-desc" | "newest";
};

export async function getProducts(query: ProductQuery = {}): Promise<Product[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog");

  let request = supabase.from("products").select(PRODUCT_FIELDS).limit(200);

  if (query.category) {
    const category = await getCategory(query.category);
    if (!category) return [];
    request = request.eq("category_id", category.id);
  }

  const q = query.q?.trim().replace(/[%,()*]/g, " ").slice(0, 60);
  if (q) {
    request = request.or(
      `name.ilike.%${q}%,brand.ilike.%${q}%,short_description.ilike.%${q}%,sku.ilike.%${q}%`,
    );
  }

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
    default:
      request = request.order("is_featured", { ascending: false }).order("name");
  }

  const { data, error } = await request;
  logError("getProducts", error);
  return normalize(data);
}

export async function getProduct(slug: string): Promise<Product | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog");
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_FIELDS)
    .eq("slug", slug)
    .maybeSingle();
  logError("getProduct", error);
  return data ? normalize([data])[0] : null;
}

export async function getRelatedProducts(product: Product, limit = 4): Promise<Product[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog");
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_FIELDS)
    .eq("category_id", product.category_id)
    .neq("id", product.id)
    .limit(limit);
  logError("getRelatedProducts", error);
  return normalize(data);
}
