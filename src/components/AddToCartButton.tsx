"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "./CartProvider";
import { useAuth } from "./AuthProvider";
import type { Product } from "@/lib/types";
import { productImage } from "@/lib/format";

export function AddToCartButton({
  product,
  withQuantity = false,
  buyNow = false,
  compact = false,
}: {
  product: Pick<Product, "id" | "slug" | "name" | "price" | "stock" | "image_url" | "images" | "category">;
  withQuantity?: boolean;
  buyNow?: boolean;
  compact?: boolean;
}) {
  const { add } = useCart();
  const { ready, user } = useAuth();
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const outOfStock = product.stock <= 0;

  function addToCart() {
    add(
      {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        price: product.price,
        icon: product.category?.icon ?? "chip",
        imageUrl: productImage(product),
        stock: product.stock,
      },
      quantity,
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  if (ready && !user) {
    return (
      <button
        type="button"
        onClick={() => router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`)}
        className={`w-full rounded-md bg-slate-800 px-4 ${compact ? "py-2" : "py-3"} text-sm font-semibold text-white transition hover:bg-slate-700`}
      >
        🔒 Login to buy
      </button>
    );
  }

  if (outOfStock) {
    return (
      <button disabled className={`w-full rounded-md bg-slate-200 px-4 ${compact ? "py-2" : "py-3"} text-sm font-semibold text-slate-500`}>
        Out of stock
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {withQuantity && (
        <div className="flex items-center rounded-lg border border-slate-300">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="px-3 py-2 text-lg leading-none hover:bg-slate-100"
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span className="w-10 text-center font-medium" aria-live="polite">{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
            className="px-3 py-2 text-lg leading-none hover:bg-slate-100"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={addToCart}
        className={`${withQuantity ? "flex-1" : "w-full"} flex items-center justify-center gap-2 rounded-md bg-brand-600 px-4 ${compact ? "py-2" : "py-3"} text-sm font-semibold text-white transition hover:bg-brand-700`}
      >
        {added ? "✓ Added" : "Add to cart"}
      </button>
      {buyNow && (
        <button
          type="button"
          onClick={() => {
            addToCart();
            router.push("/checkout");
          }}
          className="flex-1 rounded-md bg-accent-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-accent-600"
        >
          Buy now
        </button>
      )}
    </div>
  );
}
