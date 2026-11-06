"use client";

import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import { ProductImage } from "@/components/ProductImage";
import { formatINR, FREE_SHIPPING_FROM, shippingFor } from "@/lib/format";

export default function CartPage() {
  const { items, ready, subtotal, setQuantity, remove } = useCart();
  const shipping = shippingFor(subtotal);

  if (!ready) return <div className="mx-auto max-w-5xl px-4 py-16"><div className="h-40 animate-pulse rounded-xl bg-slate-100" /></div>;

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <p className="text-5xl" aria-hidden="true">🛒</p>
        <h1 className="mt-4 text-2xl font-bold">Your cart is empty</h1>
        <p className="mt-2 text-slate-600">Find the parts for your next project.</p>
        <Link href="/products" className="mt-6 inline-block rounded-lg bg-brand-600 px-5 py-2.5 font-semibold text-white hover:bg-brand-700">
          Start shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">Your cart</h1>
      <div className="grid gap-8 lg:grid-cols-3">
        <ul className="space-y-3 lg:col-span-2">
          {items.map((item) => (
            <li key={item.productId} className="flex gap-4 rounded-xl bg-white p-4 ring-1 ring-slate-200">
              <Link href={`/products/${item.slug}`} className="h-20 w-20 shrink-0 overflow-hidden rounded-lg">
                <ProductImage imageUrl={item.imageUrl} icon={item.icon} name={item.name} size="sm" />
              </Link>
              <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                <div className="flex-1">
                  <Link href={`/products/${item.slug}`} className="font-semibold hover:text-brand-700">{item.name}</Link>
                  <p className="text-sm text-slate-500">{formatINR(item.price)} each</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center rounded-lg border border-slate-300">
                    <button onClick={() => setQuantity(item.productId, item.quantity - 1)} className="px-3 py-1 hover:bg-slate-100" aria-label={`Decrease ${item.name}`}>−</button>
                    <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                    <button onClick={() => setQuantity(item.productId, item.quantity + 1)} className="px-3 py-1 hover:bg-slate-100 disabled:opacity-40" disabled={item.quantity >= item.stock} aria-label={`Increase ${item.name}`}>+</button>
                  </div>
                  <p className="w-20 text-right font-semibold">{formatINR(item.price * item.quantity)}</p>
                  <button onClick={() => remove(item.productId)} className="text-sm text-red-600 hover:underline">Remove</button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <aside className="h-fit rounded-xl bg-white p-6 ring-1 ring-slate-200">
          <h2 className="text-lg font-bold">Order summary</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatINR(subtotal)}</dd></div>
            <div className="flex justify-between"><dt>Shipping</dt><dd>{shipping === 0 ? "Free" : formatINR(shipping)}</dd></div>
            <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold"><dt>Total</dt><dd>{formatINR(subtotal + shipping)}</dd></div>
          </dl>
          {shipping > 0 && (
            <p className="mt-3 rounded-lg bg-accent-50 p-2 text-xs text-accent-600">
              Add {formatINR(FREE_SHIPPING_FROM - subtotal)} more for free shipping.
            </p>
          )}
          <Link href="/checkout" className="mt-5 block rounded-lg bg-accent-500 px-4 py-3 text-center font-semibold text-white hover:bg-accent-600">
            Proceed to checkout
          </Link>
          <Link href="/products" className="mt-3 block text-center text-sm text-brand-700 hover:underline">Continue shopping</Link>
        </aside>
      </div>
    </div>
  );
}
