import Link from "@/i18n/client";
import { getCategories, getProducts, type ProductQuery, type ProductSort } from "@/lib/data";
import { ProductGrid } from "./ProductCard";
import { SortSelect } from "./SortSelect";
import { CategoryIcon } from "./CategoryIcon";
import { getT } from "@/i18n/server";
import { localizePath } from "@/i18n/config";

const SORTS: { value: ProductSort; label: string }[] = [
  { value: "popular", label: "sort.popular" },
  { value: "best-selling", label: "sort.bestSelling" },
  { value: "rating", label: "sort.rating" },
  { value: "newest", label: "sort.newest" },
  { value: "price-asc", label: "sort.priceAsc" },
  { value: "price-desc", label: "sort.priceDesc" },
];
const PAGE_SIZE = 24;

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;
const num = (v: string | string[] | undefined) => {
  const n = Number(one(v));
  return Number.isFinite(n) && n >= 0 && one(v) !== undefined ? n : undefined;
};

export function parseShopQuery(sp: Params, fixedCategory?: string): ProductQuery {
  const sort = one(sp.sort) as ProductSort | undefined;
  return {
    q: one(sp.q)?.slice(0, 60),
    category: fixedCategory ?? one(sp.category),
    sort: SORTS.some((s) => s.value === sort) ? sort : "popular",
    minPrice: num(sp.min),
    maxPrice: num(sp.max),
    inStock: one(sp.stock) === "1",
    page: Math.max(1, Math.floor(num(sp.page) ?? 1)),
    pageSize: PAGE_SIZE,
  };
}

function hrefWith(basePath: string, query: ProductQuery, fixedCategory: boolean, changes: Partial<Record<string, string | undefined>>) {
  const p = new URLSearchParams();
  const current: Record<string, string | undefined> = {
    q: query.q,
    category: fixedCategory ? undefined : query.category,
    sort: query.sort === "popular" ? undefined : query.sort,
    min: query.minPrice?.toString(),
    max: query.maxPrice?.toString(),
    stock: query.inStock ? "1" : undefined,
    page: query.page && query.page > 1 ? String(query.page) : undefined,
  };
  for (const [k, v] of Object.entries({ ...current, ...changes })) if (v) p.set(k, v);
  const qs = p.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export async function ShopView({
  basePath,
  query,
  fixedCategory = false,
}: {
  basePath: string;
  query: ProductQuery;
  fixedCategory?: boolean;
}) {
  const [{ products, total }, categories] = await Promise.all([getProducts(query), getCategories()]);
  const page = query.page ?? 1;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(total, page * PAGE_SIZE);
  const hasFilters = query.minPrice != null || query.maxPrice != null || query.inStock;
  const { t, locale } = await getT();

  return (
    <div className="grid gap-6 lg:grid-cols-[250px_1fr]">
      {/* Filters */}
      <aside className="space-y-5">
        {!fixedCategory && (
          <details open className="rounded-md bg-white ring-1 ring-slate-200">
            <summary className="cursor-pointer border-b border-slate-100 px-4 py-3 text-sm font-bold uppercase tracking-wide">{t("footer.categories")}</summary>
            <ul className="max-h-80 overflow-y-auto py-1 text-sm">
              <li>
                <Link href={hrefWith(basePath, query, false, { category: undefined, page: undefined })}
                  className={`block px-4 py-2 hover:bg-brand-50 ${!query.category ? "font-semibold text-brand-700" : "text-slate-700"}`}>
                  {t("search.allCategories")}
                </Link>
              </li>
              {categories.map((c) => (
                <li key={c.id}>
                  <Link href={hrefWith(basePath, query, false, { category: c.slug, page: undefined })}
                    className={`flex items-center gap-2 px-4 py-2 hover:bg-brand-50 ${query.category === c.slug ? "font-semibold text-brand-700" : "text-slate-700"}`}>
                    <CategoryIcon name={c.icon} className="h-4 w-4 text-brand-600" />
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        )}
        <form action={localizePath(basePath, locale)} method="get" className="space-y-4 rounded-md bg-white p-4 ring-1 ring-slate-200">
          {query.q && <input type="hidden" name="q" value={query.q} />}
          {!fixedCategory && query.category && <input type="hidden" name="category" value={query.category} />}
          {query.sort && query.sort !== "popular" && <input type="hidden" name="sort" value={query.sort} />}
          <p className="text-sm font-bold uppercase tracking-wide">{t("shop.filterPrice")}</p>
          <div className="flex items-center gap-2">
            <label className="flex-1 text-xs text-slate-500">{t("shop.min")} ₹
              <input name="min" type="number" min={0} defaultValue={query.minPrice} className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm text-slate-900" />
            </label>
            <span className="pt-4 text-slate-400">–</span>
            <label className="flex-1 text-xs text-slate-500">{t("shop.max")} ₹
              <input name="max" type="number" min={0} defaultValue={query.maxPrice} className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm text-slate-900" />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="stock" value="1" defaultChecked={query.inStock} className="h-4 w-4 accent-brand-600" />
            {t("shop.inStockOnly")}
          </label>
          <button className="w-full rounded-md bg-brand-600 py-2 text-sm font-semibold text-white hover:bg-brand-700">{t("shop.applyFilters")}</button>
          {hasFilters && (
            <Link href={hrefWith(basePath, query, fixedCategory, { min: undefined, max: undefined, stock: undefined, page: undefined })}
              className="block text-center text-xs font-semibold text-red-600 hover:underline">
              {t("shop.clearFilters")}
            </Link>
          )}
        </form>
      </aside>

      {/* Results */}
      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md bg-white px-4 py-3 ring-1 ring-slate-200">
          <p className="text-sm text-slate-600">
            {total === 0 ? t("shop.noResults") : t("shop.showing", { from, to, total })}
            {query.q ? <> · “<span className="font-semibold">{query.q}</span>”</> : null}
          </p>
          <SortSelect
            label={t("shop.sortBy")}
            options={SORTS.map((s) => ({ label: t(s.label), href: hrefWith(basePath, query, fixedCategory, { sort: s.value === "popular" ? undefined : s.value, page: undefined }), value: s.value }))}
            value={query.sort ?? "popular"}
          />
        </div>

        {products.length === 0 ? (
          <div className="rounded-md bg-white p-10 text-center ring-1 ring-slate-200">
            <p className="font-semibold">{t("shop.noProducts")}</p>
            <p className="mt-1 text-sm text-slate-500">{t("shop.tryDifferent")}</p>
            <Link href="/products" className="mt-4 inline-block font-semibold text-brand-700 hover:underline">{t("shop.browseAll")}</Link>
          </div>
        ) : (
          <ProductGrid products={products} />
        )}

        {pages > 1 && (
          <nav className="mt-8 flex flex-wrap justify-center gap-1" aria-label={t("common.pages")}>
            {page > 1 && (
              <Link href={hrefWith(basePath, query, fixedCategory, { page: String(page - 1) })} className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm hover:border-brand-600">← {t("common.prev")}</Link>
            )}
            {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
              <Link key={n} href={hrefWith(basePath, query, fixedCategory, { page: n > 1 ? String(n) : undefined })}
                aria-current={n === page ? "page" : undefined}
                className={`rounded border px-3 py-1.5 text-sm ${n === page ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300 bg-white hover:border-brand-600"}`}>
                {n}
              </Link>
            ))}
            {page < pages && (
              <Link href={hrefWith(basePath, query, fixedCategory, { page: String(page + 1) })} className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm hover:border-brand-600">{t("common.next")} →</Link>
            )}
          </nav>
        )}
      </div>
    </div>
  );
}
