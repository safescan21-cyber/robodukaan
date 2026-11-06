"use client";

import Link from "@/i18n/client";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase-browser";
import { useI18n } from "@/i18n/client";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate, formatINR } from "@/lib/format";
import type { Order } from "@/lib/types";

export default function MyOrdersPage() {
  const { t } = useI18n();
  const [orders, setOrders] = useState<Order[] | null>(null);

  useEffect(() => {
    getSupabase()
      .from("orders")
      .select("*, order_items(id, quantity)")
      .order("created_at", { ascending: false })
      .then(({ data }) => setOrders((data as Order[]) ?? []));
  }, []);

  return (
    <div className="rounded-md bg-white ring-1 ring-slate-200">
      <h1 className="border-b border-slate-200 px-4 py-3 text-lg font-bold">{t("account.orders")}</h1>
      {orders === null ? (
        <p className="p-4 text-sm text-slate-500">{t("common.loading")}</p>
      ) : orders.length === 0 ? (
        <p className="p-6 text-sm text-slate-600">{t("orders.none")} <Link href="/products" className="font-semibold text-brand-700 hover:underline">{t("notFound.browse")}</Link></p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-600">
              <tr><th className="px-4 py-3">{t("order.label")}</th><th className="px-4 py-3">{t("orders.date")}</th><th className="px-4 py-3">{t("order.paymentStatus")}</th><th className="px-4 py-3">{t("cart.total")}</th><th className="px-4 py-3" /></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((o) => {
                const qty = o.order_items?.reduce((s, i) => s + i.quantity, 0) ?? 0;
                return (
                  <tr key={o.id}>
                    <td className="px-4 py-3 font-mono font-semibold">{o.order_number}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(o.created_at)}</td>
                    <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                    <td className="px-4 py-3">{formatINR(o.total)} <span className="text-slate-500">{t(qty === 1 ? "orders.forOne" : "orders.forMany", { qty })}</span></td>
                    <td className="px-4 py-3 text-end"><Link href={`/account/orders/${o.id}`} className="rounded bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700">{t("orders.view")}</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
