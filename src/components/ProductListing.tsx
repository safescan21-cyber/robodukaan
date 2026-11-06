import Link from "next/link";
import { getProducts, type ProductQuery } from "@/lib/data";
import { ProductGrid } from "./ProductCard";

const SORTS: { value: NonNullable<ProductQuery["sort"]>; label: string }[] = [
  { value: "popular", label: "Popular" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "newest", label: "Newest" },
];

export function parseSort(value: string | string[] | undefined): ProductQuery["sort"] {
  const v = Array.isArray(value) ? value[0] : value;
  return SORTS.some((s) => s.value === v) ? (v as ProductQuery["sort"]) : "popular";
}

export async function ProductListing({ basePath, query }: { basePath: string; query: ProductQuery }) {
  const products = await getProducts(query);
  const current = query.sort ?? "popular";

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          {products.length} {products.length === 1 ? "product" : "products"}
          {query.q ? <> for “<span className="font-semibold">{query.q}</span>”</> : null}
        </p>
        <div className="flex flex-wrap gap-2 text-sm">
          {SORTS.map((s) => {
            const params = new URLSearchParams();
            if (query.q) params.set("q", query.q);
            if (s.value !== "popular") params.set("sort", s.value);
            const qs = params.toString();
            return (
              <Link
                key={s.value}
                href={qs ? `${basePath}?${qs}` : basePath}
                className={`rounded-full px-3 py-1 ring-1 ${
                  current === s.value
                    ? "bg-brand-600 text-white ring-brand-600"
                    : "bg-white text-slate-700 ring-slate-300 hover:ring-brand-600"
                }`}
              >
                {s.label}
              </Link>
            );
          })}
        </div>
      </div>
      {products.length === 0 ? (
        <div className="rounded-xl bg-white p-10 text-center ring-1 ring-slate-200">
          <p className="font-semibold">No products found</p>
          <p className="mt-1 text-sm text-slate-500">Try a different search or browse all products.</p>
          <Link href="/products" className="mt-4 inline-block font-semibold text-brand-700 hover:underline">
            Browse all products
          </Link>
        </div>
      ) : (
        <ProductGrid products={products} />
      )}
    </>
  );
}
