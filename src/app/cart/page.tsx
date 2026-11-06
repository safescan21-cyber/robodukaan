"use client";

import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import { useAuth } from "@/components/AuthProvider";
import { ProductImage } from "@/components/ProductImage";
import { CouponBox, useCoupon } from "@/components/CouponBox";
import { formatINR, FREE_SHIPPING_FROM, shippingFor } from "@/lib/format";

export default function CartPage() {
  const { items, ready, subtotal, setQuantity, remove } = useCart();
  const { discount } = useCoupon();
  const { user } = useAuth();
  const shipping = shippingFor(subtotal);

  if (!ready) return <div className="mx-auto max-w-5xl px-4 py-16"><div className="h-40 animate-pulse rounded-md bg-slate-100" /></div>;

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <p className="text-5xl" aria-hidden="true">🛒</p>
        <h1 className="mt-4 text-2xl font-bold">Your cart is empty</h1>
        <p className="mt-2 text-slate-600">Find the boards and parts you need.</p>
        <Link href="/products" className="mt-6 inline-block rounded-md bg-brand-600 px-5 py-2.5 font-semibold text-white hover:bg-brand-700">
          Return to shop
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <h1 className="mb-5 text-2xl font-bold">Shopping cart</h1>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="overflow-hidden rounded-md bg-white ring-1 ring-slate-200">
          <div className="hidden grid-cols-[1fr_120px_130px_110px] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-600 md:grid">
            <span>Product</span><span>Price</span><span>Quantity</span><span className="text-right">Subtotal</span>
          </div>
          <ul className="divide-y divide-slate-100">
            {items.map((item) => (
              <li key={item.productId} className="grid grid-cols-[64px_1fr] gap-4 p-4 md:grid-cols-[64px_1fr_120px_130px_110px] md:items-center">
                <Link href={`/products/${item.slug}`} className="h-16 w-16 overflow-hidden rounded border border-slate-200 bg-white p-1">
                  <ProductImage imageUrl={item.imageUrl} icon={item.icon} name={item.name} size="sm" />
                </Link>
                <div>
                  <Link href={`/products/${item.slug}`} className="text-sm font-medium hover:text-brand-700">{item.name}</Link>
                  <button onClick={() => remove(item.productId)} className="mt-1 block text-xs text-red-600 hover:underline">✕ Remove</button>
                </div>
                <p className="col-start-2 text-sm md:col-start-auto">{formatINR(item.price)}</p>
                <div className="col-start-2 flex w-fit items-center rounded border border-slate-300 md:col-start-auto">
                  <button onClick={() => setQuantity(item.productId, item.quantity - 1)} className="px-3 py-1 hover:bg-slate-100" aria-label={`Decrease ${item.name}`}>−</button>
                  <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                  <button onClick={() => setQuantity(item.productId, item.quantity + 1)} disabled={item.quantity >= item.stock} className="px-3 py-1 hover:bg-slate-100 disabled:opacity-40" aria-label={`Increase ${item.name}`}>+</button>
                </div>
                <p className="col-start-2 text-sm font-semibold md:col-start-auto md:text-right">{formatINR(item.price * item.quantity)}</p>
              </li>
            ))}
          </ul>
          <div className="border-t border-slate-200 p-4">
            <Link href="/products" className="text-sm font-semibold text-brand-700 hover:underline">← Continue shopping</Link>
          </div>
        </div>

        <aside className="h-fit space-y-4 rounded-md bg-white p-5 ring-1 ring-slate-200">
          <h2 className="border-b border-slate-200 pb-3 text-sm font-bold uppercase tracking-wide">Cart totals</h2>
          <CouponBox />
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatINR(subtotal)}</dd></div>
            {discount > 0 && <div className="flex justify-between text-emerald-700"><dt>Coupon discount</dt><dd>− {formatINR(discount)}</dd></div>}
            <div className="flex justify-between"><dt>Shipping</dt><dd>{shipping === 0 ? "Free" : formatINR(shipping)}</dd></div>
            <div className="flex justify-between border-t border-slate-200 pt-3 text-lg font-bold"><dt>Total</dt><dd>{formatINR(subtotal - discount + shipping)}</dd></div>
          </dl>
          {shipping > 0 && (
            <p className="rounded bg-accent-50 p-2 text-xs text-accent-600">
              Add {formatINR(FREE_SHIPPING_FROM - subtotal)} more for free shipping.
            </p>
          )}
          <Link href={user ? "/checkout" : "/login?next=/checkout"} className="block rounded-md bg-accent-500 px-4 py-3 text-center font-bold uppercase tracking-wide text-white hover:bg-accent-600">
            {user ? "Proceed to checkout" : "Login to checkout"}
          </Link>
        </aside>
      </div>
    </div>
  );
}
