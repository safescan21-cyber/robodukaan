"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatINR } from "@/lib/format";

type LastOrder = { order_number: string; total: number; shipping: number; discount?: number };

export default function OrderSuccessPage() {
  const [order, setOrder] = useState<LastOrder | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);

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
    setOrder(saved && saved.order_number === number ? saved : null);
  }, []);

  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl text-emerald-700" aria-hidden="true">✓</div>
      <h1 className="mt-5 text-3xl font-bold">Thank you! Your order is placed.</h1>
      {orderNumber && (
        <p className="mt-3 text-slate-700">
          Order number: <span className="font-mono text-lg font-bold">{orderNumber}</span>
        </p>
      )}
      {order && <p className="mt-1 text-slate-600">Amount to pay on delivery: <span className="font-semibold">{formatINR(order.total)}</span></p>}
      <p className="mt-4 text-sm text-slate-500">
        We’ll call you on your mobile number to confirm. Save your order number to track it.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/account/orders" className="rounded-md bg-slate-800 px-5 py-2.5 font-semibold text-white hover:bg-slate-700">My orders</Link>
        <Link href="/track" className="rounded-lg bg-brand-600 px-5 py-2.5 font-semibold text-white hover:bg-brand-700">Track order</Link>
        <Link href="/products" className="rounded-lg px-5 py-2.5 font-semibold text-brand-700 ring-1 ring-brand-600 hover:bg-brand-50">Continue shopping</Link>
      </div>
    </div>
  );
}
