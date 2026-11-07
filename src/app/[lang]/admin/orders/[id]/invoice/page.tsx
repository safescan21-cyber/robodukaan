"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getSupabase } from "@/lib/supabase-browser";
import { SELLER } from "@/lib/constants";
import { InvoiceView } from "@/components/admin/InvoiceView";
import type { Order } from "@/lib/types";

function Invoice() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null | undefined>(undefined);

  useEffect(() => {
    getSupabase().from("orders").select("*, order_items(*)").eq("id", id).maybeSingle()
      .then(({ data }) => setOrder((data as Order) ?? null));
  }, [id]);

  useEffect(() => {
    if (order) document.title = `Invoice ${order.order_number}`;
  }, [order]);

  if (order === undefined) return <div className="h-96 animate-pulse rounded-md bg-slate-100" />;
  if (order === null) return <p>Order not found. <Link href="/admin/orders" className="text-brand-700 underline">Back</Link></p>;

  const missing = [!SELLER.gstin && "GSTIN", !SELLER.address && "address", !SELLER.state && "state"].filter(Boolean);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <Link href={`/admin/orders/${order.id}`} className="text-sm font-semibold text-brand-700 hover:underline">← Back to order</Link>
        <button onClick={() => window.print()} className="ml-auto rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">🖨️ Print / Save as PDF</button>
      </div>

      {missing.length > 0 && (
        <p className="rounded bg-amber-50 p-3 text-sm text-amber-800 print:hidden">Not on the invoice yet: company {missing.join(", ")}. Until the state is set, tax shows as one “GST” line instead of CGST + SGST / IGST.</p>
      )}
      <InvoiceView order={order} />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-md bg-slate-100" />}>
      <Invoice />
    </Suspense>
  );
}
