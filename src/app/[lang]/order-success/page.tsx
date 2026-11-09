"use client";

import Link from "@/i18n/client";
import { useEffect, useState } from "react";
import { formatINR } from "@/lib/format";
import { useI18n } from "@/i18n/client";

type LastOrder = { order_number: string; total: number; shipping: number; discount?: number };

export default function OrderSuccessPage() {
  const { t } = useI18n();
  const [order, setOrder] = useState<LastOrder | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    const number = new URLSearchParams(window.location.search).get("order");
    let saved: LastOrder | null = null;
    try {
      const raw = sessionStorage.getItem("robodukaan-last-order");
      saved = raw ? JSON.parse(raw) : null;
    } catch {
      saved = null;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read browser-only state once
    setOrderNumber(number);
    setPaid(new URLSearchParams(window.location.search).get("paid") === "1");
    setOrder(saved && saved.order_number === number ? saved : null);
  }, []);

  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl text-emerald-700" aria-hidden="true">✓</div>
      <h1 className="mt-5 text-3xl font-bold">{t("success.title")}</h1>
      {orderNumber && (
        <p className="mt-3 text-slate-700">
          {t("success.orderNumber")}: <span className="font-mono text-lg font-bold">{orderNumber}</span>
        </p>
      )}
      {order && <p className="mt-1 text-slate-600">{t("success.amount")}: <span className="font-semibold">{formatINR(order.total)}</span></p>}
      {paid && <p className="mx-auto mt-3 w-fit rounded-full bg-emerald-50 px-4 py-1.5 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-200">💳 {t("pay.paidOk")}</p>}
      <p className="mt-4 text-sm text-slate-500">
        {t("success.note")}
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/account/orders" className="rounded-md bg-slate-800 px-5 py-2.5 font-semibold text-white hover:bg-slate-700">{t("account.orders")}</Link>
        <Link href="/track" className="rounded-lg bg-brand-600 px-5 py-2.5 font-semibold text-white hover:bg-brand-700">{t("nav.trackOrder")}</Link>
        <Link href="/products" className="rounded-lg px-5 py-2.5 font-semibold text-brand-700 ring-1 ring-brand-600 hover:bg-brand-50">{t("cart.continue")}</Link>
      </div>
    </div>
  );
}
