import Link from "next/link";
import type { Product } from "@/lib/types";
import { discountPercent, formatINR } from "@/lib/format";
import { ProductImage } from "./ProductImage";
import { AddToCartButton } from "./AddToCartButton";

export function ProductCard({ product }: { product: Product }) {
  const off = discountPercent(product.price, product.mrp);
  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:shadow-lg">
      <Link href={`/products/${product.slug}`} className="relative block aspect-square">
        <ProductImage imageUrl={product.image_url} icon={product.category?.icon ?? "chip"} name={product.name} />
        {off > 0 && (
          <span className="absolute left-2 top-2 rounded-md bg-accent-500 px-2 py-0.5 text-xs font-bold text-white">
            {off}% OFF
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        {product.category && (
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{product.category.name}</p>
        )}
        <Link href={`/products/${product.slug}`} className="line-clamp-2 font-semibold text-slate-900 group-hover:text-brand-700">
          {product.name}
        </Link>
        <div className="mt-auto flex items-baseline gap-2 pt-1">
          <span className="text-lg font-bold text-slate-900">{formatINR(product.price)}</span>
          {product.mrp && product.mrp > product.price && (
            <span className="text-sm text-slate-400 line-through">{formatINR(product.mrp)}</span>
          )}
        </div>
        <AddToCartButton product={product} />
      </div>
    </article>
  );
}

export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="aspect-square bg-slate-100" />
          <div className="space-y-2 p-4">
            <div className="h-3 w-1/3 rounded bg-slate-100" />
            <div className="h-4 w-3/4 rounded bg-slate-100" />
            <div className="h-5 w-1/4 rounded bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}
