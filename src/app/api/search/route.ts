import { getCategories, getProducts } from "@/lib/data";
import { productImage } from "@/lib/format";

// Search suggestions for the header search box: a few matching products and categories.
// Uses the same cached product search as the shop, so it's quick and light on the database.
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim().slice(0, 60) ?? "";
  if (q.length < 2) return Response.json({ products: [], categories: [] });
  const [{ products, total }, categories] = await Promise.all([getProducts({ q, pageSize: 6 }), getCategories()]);
  const lower = q.toLowerCase();
  return Response.json(
    {
      total,
      products: products.map((p) => ({ name: p.name, slug: p.slug, sku: p.sku, price: p.price, image: productImage(p), icon: p.category?.icon ?? "chip" })),
      categories: categories.filter((c) => c.name.toLowerCase().includes(lower)).slice(0, 3).map((c) => ({ name: c.name, slug: c.slug })),
    },
    { headers: { "Cache-Control": "public, max-age=60" } },
  );
}
