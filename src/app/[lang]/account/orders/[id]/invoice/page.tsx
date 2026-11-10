"use client";

import Link from "@/i18n/client";
import { Suspense, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getSupabase } from "@/lib/supabase-browser";
import { useI18n } from "@/i18n/client";
import { InvoiceView } from "@/components/admin/InvoiceView";
import { downloadInvoicePdf } from "@/lib/invoice-download";
import type { Order } from "@/lib/types";

// Customer's GST invoice for one of their orders (linked from the order-confirmed email and WhatsApp).
function MyInvoice() {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();
  const [order, setOrder] = useState<Order | null | undefined>(undefined);
  const [pdfBusy, setPdfBusy] = useState(false);

  useEffect(() => {
    getSupabase().from("orders").select("*, order_items(*)").eq("id", id).maybeSingle()
      .then(({ data }) => setOrder((data as Order) ?? null));
  }, [id]);
  useEffect(() => {
    if (order?.invoice_number) document.title = `Invoice ${order.invoice_number.replaceAll("/", "-")}`;
  }, [order]);

  if (order === undefined) return <div className="h-96 animate-pulse rounded-md bg-slate-100" />;
  if (order === null) return <p className="rounded-md bg-white p-6 ring-1 ring-slate-200">{t("orders.notFound")} <Link href="/account/orders" className="text-brand-700 underline">{t("orders.back")}</Link></p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <Link href={`/account/orders/${order.id}`} className="text-sm font-semibold text-brand-700 hover:underline"><span className="inline-block rtl:-scale-x-100">←</span> {order.order_number}</Link>
        {order.invoice_number && (
          <span className="ms-auto flex flex-wrap gap-2">
            <button onClick={async () => { setPdfBusy(true); try { await downloadInvoicePdf(order.id, `Invoice-${order.invoice_number!.replace(/[^A-Za-z0-9-]+/g, "-")}.pdf`); } catch { /* ignore */ } setPdfBusy(false); }} disabled={pdfBusy}
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">⬇ {t("invoice.downloadPdf")}</button>
            <button onClick={() => window.print()} className="rounded-md px-4 py-2 text-sm font-semibold text-brand-700 ring-1 ring-brand-200 hover:bg-brand-50">🖨️ {t("invoice.print")}</button>
          </span>
        )}
      </div>
      {order.invoice_number
        ? <InvoiceView order={order} />
        : <p className="rounded-md bg-sky-50 p-4 text-sm text-sky-900">{t("invoice.notYet")}</p>}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-md bg-slate-100" />}>
      <MyInvoice />
    </Suspense>
  );
}
