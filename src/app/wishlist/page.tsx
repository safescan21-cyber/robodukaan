"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase-browser";
import { useAuth } from "@/components/AuthProvider";
import { useWishlist } from "@/components/WishlistProvider";
import { ProductImage } from "@/components/ProductImage";
import { AddToCartButton } from "@/components/AddToCartButton";
import { formatINR, productImage } from "@/lib/format";
import type { Product } from "@/lib/types";

export default function WishlistPage() {
  const { ready, user } = useAuth();
  const { ids, toggle } = useWishlist();
  const [products, setProducts] = useState<Product[] | null>(null);

  useEffect(() => {
    if (!user) return;
    const list = [...ids];
    if (list.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- nothing to fetch
      setProducts([]);
      return;
    }
    getSupabase()
      .from("products")
      .select("id, slug, name, price, mrp, stock, image_url, images, category:categories(slug, name, icon)")
      .in("id", list)
      .then(({ data }) => setProducts(((data ?? []) as unknown as Product[]).map((p) => ({ ...p, price: Number(p.price) }))));
  }, [user, ids]);

  if (!ready) return <div className="mx-auto max-w-5xl px-4 py-16"><div className="h-40 animate-pulse rounded-md bg-slate-100" /></div>;

  if (!user) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <p className="text-5xl" aria-hidden="true">❤️</p>
        <h1 className="mt-4 text-2xl font-bold">Your wishlist</h1>
        <p className="mt-2 text-slate-600">Log in to save products you love and come back to them later.</p>
        <Link href="/login?next=/wishlist" className="mt-6 inline-block rounded-md bg-brand-600 px-5 py-2.5 font-semibold text-white">Log in</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="mb-5 text-2xl font-bold">My wishlist</h1>
      {products === null ? (
        <div className="h-40 animate-pulse rounded-md bg-slate-100" />
      ) : products.length === 0 ? (
        <div className="rounded-md bg-white p-10 text-center ring-1 ring-slate-200">
          <p className="text-slate-600">Your wishlist is empty.</p>
          <Link href="/products" className="mt-4 inline-block font-semibold text-brand-700 hover:underline">Return to shop</Link>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-md bg-white ring-1 ring-slate-200">
          {products.map((p) => (
            <li key={p.id} className="grid grid-cols-[64px_1fr] items-center gap-4 p-4 sm:grid-cols-[64px_1fr_120px_160px_32px]">
              <Link href={`/products/${p.slug}`} className="h-16 w-16 overflow-hidden rounded border border-slate-200 bg-white p-1">
                <ProductImage imageUrl={productImage(p)} icon={p.category?.icon ?? "chip"} name={p.name} size="sm" />
              </Link>
              <div>
                <Link href={`/products/${p.slug}`} className="text-sm font-medium hover:text-brand-700">{p.name}</Link>
                <p className={`text-xs ${p.stock > 0 ? "text-emerald-700" : "text-red-600"}`}>{p.stock > 0 ? "In stock" : "Out of stock"}</p>
              </div>
              <p className="col-start-2 text-sm font-bold text-brand-700 sm:col-start-auto">{formatINR(p.price)}</p>
              <div className="col-start-2 sm:col-start-auto"><AddToCartButton product={p} compact /></div>
              <button onClick={() => toggle(p.id)} className="col-start-2 text-left text-sm text-red-600 sm:col-start-auto" aria-label={`Remove ${p.name} from wishlist`}>✕</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
