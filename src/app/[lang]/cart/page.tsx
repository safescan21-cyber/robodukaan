"use client";

import Link from "@/i18n/client";
import { useCart } from "@/components/CartProvider";
import { useAuth } from "@/components/AuthProvider";
import { useI18n } from "@/i18n/client";
import { ProductImage } from "@/components/ProductImage";
import { CouponBox, useCoupon } from "@/components/CouponBox";
import { nextTier, unitPrice } from "@/lib/pricing";
import { formatINR, FREE_SHIPPING_FROM, GST_RATE, gstFor, shippingFor } from "@/lib/format";

export default function CartPage() {
  const { items, ready, subtotal, setQuantity, remove } = useCart();
  const { discount } = useCoupon();
  const { user } = useAuth();
  const { t } = useI18n();
  const shipping = shippingFor(subtotal);
  const gst = gstFor(subtotal - discount + shipping);

  if (!ready) return <div className="mx-auto max-w-5xl px-4 py-16"><div className="h-40 animate-pulse rounded-md bg-slate-100" /></div>;

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <p className="text-5xl" aria-hidden="true">🛒</p>
        <h1 className="mt-4 text-2xl font-bold">{t("cart.empty")}</h1>
        <p className="mt-2 text-slate-600">{t("cart.emptyText")}</p>
        <Link href="/products" className="mt-6 inline-block rounded-md bg-brand-600 px-5 py-2.5 font-semibold text-white hover:bg-brand-700">
          {t("cart.returnToShop")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <h1 className="mb-5 text-2xl font-bold">{t("cart.title")}</h1>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="overflow-hidden rounded-md bg-white ring-1 ring-slate-200">
          <div className="hidden grid-cols-[1fr_120px_130px_110px] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-600 md:grid">
            <span>{t("cart.product")}</span><span>{t("cart.price")}</span><span>{t("form.quantity")}</span><span className="text-end">{t("cart.subtotal")}</span>
          </div>
          <ul className="divide-y divide-slate-100">
            {items.map((item) => (
              <li key={item.productId} className="grid grid-cols-[64px_1fr] gap-4 p-4 md:grid-cols-[64px_1fr_120px_130px_110px] md:items-center">
                <Link href={`/products/${item.slug}`} className="h-16 w-16 overflow-hidden rounded border border-slate-200 bg-white p-1">
                  <ProductImage imageUrl={item.imageUrl} icon={item.icon} name={item.name} size="sm" />
                </Link>
                <div>
                  <Link href={`/products/${item.slug}`} className="text-sm font-medium hover:text-brand-700">{item.name}</Link>
                  <button onClick={() => remove(item.productId)} className="mt-1 block text-xs text-red-600 hover:underline">✕ {t("common.remove")}</button>
                </div>
                <div className="col-start-2 text-sm md:col-start-auto">
                  {unitPrice(item.price, item.tiers, item.quantity) < item.price ? (
                    <><span className="font-semibold text-emerald-700">{formatINR(unitPrice(item.price, item.tiers, item.quantity))}</span> <s className="text-xs text-slate-400">{formatINR(item.price)}</s><span className="block text-xs text-emerald-700">{t("tiers.applied")}</span></>
                  ) : formatINR(item.price)}
                  {(() => { const n = nextTier(item.price, item.tiers, item.quantity); return n && n.min_qty <= item.stock ? (
                    <button onClick={() => setQuantity(item.productId, n.min_qty)} className="block text-start text-xs text-brand-700 hover:underline">{t("tiers.addMore", { n: n.min_qty - item.quantity, price: formatINR(n.price) })}</button>
                  ) : null; })()}
                </div>
                <div className="col-start-2 flex w-fit items-center rounded border border-slate-300 md:col-start-auto">
                  <button onClick={() => setQuantity(item.productId, item.quantity - 1)} className="px-3 py-1 hover:bg-slate-100" aria-label={`${t("cart.decrease")}: ${item.name}`}>−</button>
                  <input type="number" inputMode="numeric" min={1} max={item.stock} value={item.quantity} aria-label={`${t("form.quantity")}: ${item.name}`}
                    onChange={(e) => { const v = parseInt(e.target.value, 10); if (v > 0) setQuantity(item.productId, v); }}
                    className="w-12 appearance-none border-0 bg-transparent p-0 text-center text-sm font-medium [-moz-appearance:textfield] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none" />
                  <button onClick={() => setQuantity(item.productId, item.quantity + 1)} disabled={item.quantity >= item.stock} className="px-3 py-1 hover:bg-slate-100 disabled:opacity-40" aria-label={`${t("cart.increase")}: ${item.name}`}>+</button>
                </div>
                <p className="col-start-2 text-sm font-semibold md:col-start-auto md:text-end">{formatINR(unitPrice(item.price, item.tiers, item.quantity) * item.quantity)}</p>
              </li>
            ))}
          </ul>
          <div className="border-t border-slate-200 p-4">
            <Link href="/products" className="text-sm font-semibold text-brand-700 hover:underline"><span className="inline-block rtl:-scale-x-100">←</span> {t("cart.continue")}</Link>
          </div>
        </div>

        <aside className="h-fit space-y-4 rounded-md bg-white p-5 ring-1 ring-slate-200">
          <h2 className="border-b border-slate-200 pb-3 text-sm font-bold uppercase tracking-wide">{t("cart.totals")}</h2>
          <CouponBox />
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt>{t("cart.subtotal")}</dt><dd>{formatINR(subtotal)}</dd></div>
            {discount > 0 && <div className="flex justify-between text-emerald-700"><dt>{t("cart.couponDiscount")}</dt><dd>− {formatINR(discount)}</dd></div>}
            <div className="flex justify-between"><dt>{t("cart.shipping")}</dt><dd>{shipping === 0 ? t("cart.free") : formatINR(shipping)}</dd></div>
            <div className="flex justify-between"><dt>{t("cart.gst", { rate: GST_RATE })}</dt><dd>{formatINR(gst)}</dd></div>
            <div className="flex justify-between border-t border-slate-200 pt-3 text-lg font-bold"><dt>{t("cart.total")}</dt><dd>{formatINR(subtotal - discount + shipping + gst)}</dd></div>
          </dl>
          {shipping > 0 && (
            <p className="rounded bg-accent-50 p-2 text-xs text-accent-700">
              {t("cart.addMore", { amount: formatINR(FREE_SHIPPING_FROM - subtotal) })}
            </p>
          )}
          <Link href={user ? "/checkout" : "/login?next=/checkout"} className="block rounded-md bg-accent-500 px-4 py-3 text-center font-bold uppercase tracking-wide text-white hover:bg-accent-600">
            {user ? t("cart.checkout") : t("cart.loginCheckout")}
          </Link>
        </aside>
      </div>
    </div>
  );
}
