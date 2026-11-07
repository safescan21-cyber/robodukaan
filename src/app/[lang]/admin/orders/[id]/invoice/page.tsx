"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getSupabase } from "@/lib/supabase-browser";
import { SELLER } from "@/lib/constants";
import { InvoiceView } from "@/components/admin/InvoiceView";
import type { Order } from "@/lib/types";

function Invoice() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null | undefined>(undefined);
  const [issuing, setIssuing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await getSupabase().from("orders").select("*, order_items(*)").eq("id", id).maybeSingle();
    setOrder((data as Order) ?? null);
  }, [id]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount
    load();
  }, [load]);

  async function issue() {
    if (!confirm("Issue the next invoice number for this order?\n\nNumbers run in sequence and can't be changed or reused afterwards.")) return;
    setIssuing(true);
    setError(null);
    const { error } = await getSupabase().rpc("issue_invoice", { p_order_id: id });
    setIssuing(false);
    if (error) {
      setError(error.message.includes("issue_invoice")
        ? "Invoice numbering isn't set up yet: run supabase/migrations/RUN-IN-SUPABASE.sql in the Supabase SQL Editor."
        : error.message);
      return;
    }
    load();
  }

  useEffect(() => {
    if (order) document.title = `Invoice ${order.invoice_number?.replaceAll("/", "-") ?? order.order_number}`;
  }, [order]);

  if (order === undefined) return <div className="h-96 animate-pulse rounded-md bg-slate-100" />;
  if (order === null) return <p>Order not found. <Link href="/admin/orders" className="text-brand-700 underline">Back</Link></p>;

  const missing = [!SELLER.gstin && "GSTIN", !SELLER.address && "address", !SELLER.state && "state"].filter(Boolean);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <Link href={`/admin/orders/${order.id}`} className="text-sm font-semibold text-brand-700 hover:underline">← Back to order</Link>
        <div className="ml-auto flex flex-wrap gap-2">
          {!order.invoice_number && order.status !== "cancelled" && (
            <button onClick={issue} disabled={issuing} className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">{issuing ? "Issuing…" : "🧾 Issue invoice number"}</button>
          )}
          <button onClick={() => window.print()} className={`rounded-md px-4 py-2 text-sm font-semibold ${order.invoice_number ? "bg-brand-600 text-white hover:bg-brand-700" : "ring-1 ring-slate-300 hover:bg-slate-50"}`}>🖨️ {order.invoice_number ? "Print / Save as PDF" : "Print draft"}</button>
        </div>
      </div>
      {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700 print:hidden" role="alert">{error}</p>}
      {!order.invoice_number && order.status !== "cancelled" && (
        <p className="rounded bg-sky-50 p-3 text-sm text-sky-900 print:hidden">This order has no invoice number yet. Click <b>Issue invoice number</b> when you dispatch the goods — it gets the next number in sequence (e.g. PD/2026-27/0001).</p>
      )}
      {!order.invoice_number && order.status === "cancelled" && (
        <p className="rounded bg-slate-100 p-3 text-sm text-slate-700 print:hidden">Cancelled orders don’t get an invoice number.</p>
      )}

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
