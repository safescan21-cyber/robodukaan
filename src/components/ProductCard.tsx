import { validTiers } from "@/lib/pricing";
import Link from "@/i18n/client";
import type { Product } from "@/lib/types";
import { discountPercent, formatINR, productImage } from "@/lib/format";
import { ProductImage } from "./ProductImage";
import { AddToCartButton } from "./AddToCartButton";
import { WishlistButton } from "./WishlistButton";
import { Stars } from "./Stars";
import { getT } from "@/i18n/server";

export async function ProductCard({ product }: { product: Product }) {
  const { t } = await getT();
  const off = discountPercent(product.price, product.mrp);
  return (
    <article className="group relative flex h-full flex-col rounded-md border border-slate-200 bg-white transition hover:border-brand-600 hover:shadow-lg">
      <div className="absolute right-2 top-2 z-10 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
        <WishlistButton productId={product.id} />
      </div>
      <Link href={`/products/${product.slug}`} className="relative block aspect-square overflow-hidden rounded-t-md p-3">
        <ProductImage imageUrl={productImage(product)} icon={product.category?.icon ?? "chip"} name={product.name} />
        <span className="absolute left-2 top-2 flex flex-col items-start gap-1">
          {product.is_new_arrival && (
            <span className="rounded bg-emerald-600 px-2 py-0.5 text-[11px] font-bold uppercase text-white">{t("product.newBadge")}</span>
          )}
          {off > 0 && (
            <span className="rounded bg-red-600 px-2 py-0.5 text-[11px] font-bold uppercase text-white">{t("product.sale", { off })}</span>
          )}
        </span>
        {product.stock <= 0 && (
          <span className="absolute inset-x-0 bottom-0 bg-slate-900/70 py-1 text-center text-xs font-semibold text-white">{t("product.outOfStock")}</span>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-1.5 border-t border-slate-100 p-3">
        <Link href={`/products/${product.slug}`} className="line-clamp-2 min-h-10 text-sm font-medium leading-5 text-slate-800 hover:text-brand-700">
          {product.name}
        </Link>
        <div className="h-4">{product.rating_count > 0 && <Stars value={product.rating_avg} count={product.rating_count} />}</div>
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-base font-bold text-brand-700">{formatINR(product.price)}</span>
          {product.mrp && product.mrp > product.price && (
            <span className="text-xs text-slate-500 line-through">{formatINR(product.mrp)}</span>
          )}
        </div>
        <p className="text-[11px] text-slate-500">{t("product.plusGst")}</p>
        {(() => { const best = validTiers(product.price_tiers, product.price).at(-1); return best ? (
          <p className="text-[11px] font-semibold text-emerald-700">💰 {t("tiers.card", { qty: best.min_qty, price: formatINR(best.price) })}</p>
        ) : null; })()}
        <div className="mt-auto pt-1">
          <AddToCartButton product={product} compact />
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ products, columns = 4 }: { products: Product[]; columns?: 4 | 5 }) {
  return (
    <div className={`grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 ${columns === 5 ? "lg:grid-cols-4 xl:grid-cols-5" : "lg:grid-cols-4"}`}>
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}

export function ProductRow({ products }: { products: Product[] }) {
  return (
    <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:gap-4">
      {products.map((p) => (
        <div key={p.id} className="w-44 shrink-0 snap-start sm:w-52">
          <ProductCard product={p} />
        </div>
      ))}
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-md border border-slate-200 bg-white">
          <div className="aspect-square bg-slate-100" />
          <div className="space-y-2 p-3">
            <div className="h-4 w-3/4 rounded bg-slate-100" />
            <div className="h-4 w-1/2 rounded bg-slate-100" />
            <div className="h-8 rounded bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

export async function SectionHeading({ title, href, linkLabel }: { title: string; href?: string; linkLabel?: string }) {
  const { t } = await getT();
  return (
    <div className="mb-4 flex items-end justify-between border-b-2 border-slate-200">
      <h2 className="-mb-0.5 border-b-2 border-accent-500 pb-2 text-lg font-bold uppercase tracking-wide text-slate-800 sm:text-xl">
        {title}
      </h2>
      {href && (
        <Link href={href} className="pb-2 text-sm font-semibold text-brand-700 hover:underline">
          {linkLabel ?? t("common.viewAll")} <span className="inline-block rtl:-scale-x-100">→</span>
        </Link>
      )}
    </div>
  );
}
