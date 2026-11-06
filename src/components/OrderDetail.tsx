"use client";

import Link from "@/i18n/client";
import { useI18n } from "@/i18n/client";
import { formatDate, formatINR } from "@/lib/format";
import type { Order } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";
import { ProductImage } from "./ProductImage";

const STEPS = ["pending", "confirmed", "packed", "shipped", "delivered"] as const;

export function OrderDetail({ order, actions }: { order: Order; actions?: React.ReactNode }) {
  const step = STEPS.indexOf(order.status as (typeof STEPS)[number]);
  const { t } = useI18n();
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-white p-5 ring-1 ring-slate-200">
        <div>
          <p className="text-sm text-slate-500">{t("order.label")}</p>
          <h1 className="font-mono text-xl font-bold">{order.order_number}</h1>
          <p className="text-sm text-slate-500">{t("order.placedOn", { date: formatDate(order.created_at) })}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={order.status} />
          {actions}
        </div>
      </div>

      {order.status !== "cancelled" && (
        <ol className="grid grid-cols-5 gap-2 rounded-md bg-white p-5 text-center text-xs ring-1 ring-slate-200">
          {STEPS.map((s, i) => (
            <li key={s}>
              <div className={`h-2 rounded-full ${i <= step ? "bg-emerald-500" : "bg-slate-200"}`} />
              <p className={`mt-2 ${i <= step ? "font-semibold text-emerald-700" : "text-slate-400"}`}>{t(`orderStatus.${s}`)}</p>
            </li>
          ))}
        </ol>
      )}
      {order.tracking_url && (
        <a href={order.tracking_url} target="_blank" rel="noopener noreferrer" className="inline-block rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
          {t("order.trackCourier")} <span className="inline-block rtl:-scale-x-100">→</span>
        </a>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <section className="rounded-md bg-white ring-1 ring-slate-200">
          <h2 className="border-b border-slate-200 px-4 py-3 text-sm font-bold uppercase tracking-wide">{t("order.items")}</h2>
          <ul className="divide-y divide-slate-100">
            {order.order_items?.map((i) => (
              <li key={i.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                <span className="h-12 w-12 shrink-0 overflow-hidden rounded border border-slate-200 bg-white p-0.5">
                  <ProductImage imageUrl={i.image_url} icon="chip" name={i.name} size="sm" />
                </span>
                <span className="flex-1">
                  {i.slug ? <Link href={`/products/${i.slug}`} className="font-medium hover:text-brand-700">{i.name}</Link> : <span className="font-medium">{i.name}</span>}
                  <span className="block text-xs text-slate-500">SKU {i.sku}{i.hsn_code ? ` · HSN ${i.hsn_code}` : ""} · {formatINR(i.unit_price)} × {i.quantity}</span>
                </span>
                <span className="font-semibold">{formatINR(i.line_total)}</span>
              </li>
            ))}
          </ul>
          <dl className="space-y-1.5 border-t border-slate-200 px-4 py-3 text-sm">
            <div className="flex justify-between"><dt>{t("cart.subtotal")}</dt><dd>{formatINR(order.subtotal)}</dd></div>
            {Number(order.discount) > 0 && <div className="flex justify-between text-emerald-700"><dt>{t("cart.discount")} {order.coupon_code ? `(${order.coupon_code})` : ""}</dt><dd>− {formatINR(order.discount)}</dd></div>}
            <div className="flex justify-between"><dt>{t("cart.shipping")}</dt><dd>{Number(order.shipping) === 0 ? t("cart.free") : formatINR(order.shipping)}</dd></div>
            {Number(order.gst_amount ?? 0) > 0 && <div className="flex justify-between"><dt>{t("cart.gst", { rate: Number(order.gst_rate) })}</dt><dd>{formatINR(Number(order.gst_amount))}</dd></div>}
            <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold"><dt>{t("cart.total")}</dt><dd>{formatINR(order.total)}</dd></div>
          </dl>
        </section>
        <aside className="space-y-5">
          <section className="rounded-md bg-white p-4 text-sm ring-1 ring-slate-200">
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide">{t("order.shippingAddress")}</h2>
            <p className="font-semibold">{order.customer_name}</p>
            <p className="text-slate-600">{order.address_line}<br />{order.city}, {order.state} – {order.pincode}</p>
            <p className="mt-2 text-slate-600">📞 {order.phone}{order.email ? <><br />✉️ {order.email}</> : null}</p>
            {order.notes && <p className="mt-2 rounded bg-slate-50 p-2 text-xs text-slate-600">Note: {order.notes}</p>}
          </section>
          <section className="rounded-md bg-white p-4 text-sm ring-1 ring-slate-200">
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide">{t("order.payment")}</h2>
            <p>{t("trust.cod")}</p>
            <p className="text-slate-600">{t("order.paymentStatus")}: <span className="font-semibold">{t(`paymentStatus.${order.payment_status}`)}</span></p>
          </section>
        </aside>
      </div>
    </div>
  );
}
