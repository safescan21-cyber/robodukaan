"use client";

import Link from "@/i18n/client";
import { useCallback, useEffect, useState } from "react";
import { Suspense } from "react";
import { useParams } from "next/navigation";
import { getSupabase } from "@/lib/supabase-browser";
import { postAsUser } from "@/lib/api-client";
import { useCart } from "@/components/CartProvider";
import { useRouter } from "@/i18n/client";
import { productImage } from "@/lib/format";
import { useI18n } from "@/i18n/client";
import { OrderDetail } from "@/components/OrderDetail";
import type { Order } from "@/lib/types";

function MyOrderPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();
  const [order, setOrder] = useState<Order | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const { add } = useCart();
  const router = useRouter();
  const [buying, setBuying] = useState(false);

  // Buy again: the same items at today's price and stock.
  async function buyAgain(o: Order) {
    const ids = (o.order_items ?? []).map((i) => i.product_id).filter((x): x is string => !!x);
    if (!ids.length) return setError(t("orders.buyAgainNone"));
    setBuying(true);
    const { data } = await getSupabase().from("products")
      .select("id, slug, name, price, price_tiers, stock, image_url, images, category:categories(icon)").in("id", ids).eq("is_active", true);
    setBuying(false);
    type P = { id: string; slug: string; name: string; price: number; price_tiers: { min_qty: number; price: number }[]; stock: number; image_url: string | null; images: string[]; category: { icon: string } | null };
    const list = ((data ?? []) as unknown as P[]).filter((p) => p.stock > 0);
    if (!list.length) return setError(t("orders.buyAgainNone"));
    for (const p of list) {
      const qty = (o.order_items ?? []).filter((i) => i.product_id === p.id).reduce((n, i) => n + i.quantity, 0);
      add({ productId: p.id, slug: p.slug, name: p.name, price: p.price, icon: p.category?.icon ?? "chip", imageUrl: productImage(p), stock: p.stock, ...(p.price_tiers?.length ? { tiers: p.price_tiers } : {}) }, qty);
    }
    router.push("/cart");
  }

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
          <button onClick={() => buyAgain(order)} disabled={buying} className="rounded-md bg-accent-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-accent-600 disabled:opacity-60">🔁 {t("orders.buyAgain")}</button>
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
