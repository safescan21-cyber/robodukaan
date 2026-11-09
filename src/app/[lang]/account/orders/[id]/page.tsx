"use client";

import Link from "@/i18n/client";
import { useCallback, useEffect, useState } from "react";
import { Suspense } from "react";
import { useParams } from "next/navigation";
import { getSupabase } from "@/lib/supabase-browser";
import { postAsUser } from "@/lib/api-client";
import { useI18n } from "@/i18n/client";
import { OrderDetail } from "@/components/OrderDetail";
import type { Order } from "@/lib/types";

function MyOrderPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();
  const [order, setOrder] = useState<Order | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await getSupabase().from("orders").select("*, order_items(*)").eq("id", id).maybeSingle();
    setOrder((data as Order) ?? null);
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount
    load();
  }, [load]);

  if (order === undefined) return <div className="h-64 animate-pulse rounded-md bg-slate-100" />;
  if (order === null) return <p className="rounded-md bg-white p-6 ring-1 ring-slate-200">{t("orders.notFound")} <Link href="/account/orders" className="text-brand-700 underline">{t("orders.back")}</Link></p>;

  const canCancel = order.status === "pending" || order.status === "confirmed";

  return (
    <>
      <Link href="/account/orders" className="mb-3 inline-block text-sm font-semibold text-brand-700 hover:underline"><span className="inline-block rtl:-scale-x-100">←</span> {t("orders.all")}</Link>
      {error && <p className="mb-3 rounded bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
      <OrderDetail
        order={order}
        actions={<>
          {order.invoice_number && (
            <Link href={`/account/orders/${order.id}/invoice`} className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700">🧾 {t("invoice.view")}</Link>
          )}
          {canCancel ? (
          <button
            onClick={async () => {
              if (!confirm(t("orders.confirmCancel"))) return;
              const { error } = await getSupabase().rpc("cancel_my_order", { p_order_id: order.id });
              if (error) setError(error.message);
              else { postAsUser("/api/order-update", { orderId: order.id }); load(); }
            }}
            className="rounded-md px-3 py-1.5 text-sm font-semibold text-red-600 ring-1 ring-red-300 hover:bg-red-50"
          >
            {t("orders.cancel")}
          </button>
          ) : null}
        </>}
      />
    </>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-md bg-slate-100" />}>
      <MyOrderPage />
    </Suspense>
  );
}
