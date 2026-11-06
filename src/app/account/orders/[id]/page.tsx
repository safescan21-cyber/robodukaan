"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Suspense } from "react";
import { useParams } from "next/navigation";
import { getSupabase } from "@/lib/supabase-browser";
import { OrderDetail } from "@/components/OrderDetail";
import type { Order } from "@/lib/types";

function MyOrderPage() {
  const { id } = useParams<{ id: string }>();
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
  if (order === null) return <p className="rounded-md bg-white p-6 ring-1 ring-slate-200">Order not found. <Link href="/account/orders" className="text-brand-700 underline">Back to orders</Link></p>;

  const canCancel = order.status === "pending" || order.status === "confirmed";

  return (
    <>
      <Link href="/account/orders" className="mb-3 inline-block text-sm font-semibold text-brand-700 hover:underline">← All orders</Link>
      {error && <p className="mb-3 rounded bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
      <OrderDetail
        order={order}
        actions={canCancel ? (
          <button
            onClick={async () => {
              if (!confirm("Cancel this order?")) return;
              const { error } = await getSupabase().rpc("cancel_my_order", { p_order_id: order.id });
              if (error) setError(error.message);
              else load();
            }}
            className="rounded-md px-3 py-1.5 text-sm font-semibold text-red-600 ring-1 ring-red-300 hover:bg-red-50"
          >
            Cancel order
          </button>
        ) : null}
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
