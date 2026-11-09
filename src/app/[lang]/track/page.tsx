"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getSupabase } from "@/lib/supabase-browser";
import { formatDate, formatINR } from "@/lib/format";
import { useI18n } from "@/i18n/client";
import { RepairTimeline } from "@/components/RepairTimeline";
import type { OrderStatus, TrackedRepair } from "@/lib/types";

type TrackedOrder = {
  order_number: string;
  status: OrderStatus;
  tracking_url: string | null;
  discount: number;
  gst_rate?: number;
  gst_amount?: number;
  customer_name: string;
  city: string;
  subtotal: number;
  shipping: number;
  total: number;
  created_at: string;
  items: { name: string; quantity: number; unit_price: number; line_total: number }[];
};

const STEPS = ["pending", "confirmed", "packed", "shipped", "delivered"] as const;

export default function Page() {
  const { t } = useI18n();
  return (
    <Suspense fallback={<div className="mx-auto max-w-2xl px-4 py-12"><h1 className="text-3xl font-bold">{t("track.title")}</h1><div className="mt-6 h-40 animate-pulse rounded-xl bg-slate-100" /></div>}>
      <TrackPage />
    </Suspense>
  );
}

function TrackPage() {
  const { t } = useI18n();
  const params = useSearchParams();
  const repairParam = params.get("repair") ?? "";
  const [tab, setTab] = useState<"order" | "repair">(repairParam ? "repair" : "order");
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setLoading(true);
    setMessage(null);
    setOrder(null);
    const { data, error } = await getSupabase().rpc("track_order", {
      p_order_number: String(form.get("order") ?? ""),
      p_phone: String(form.get("phone") ?? ""),
    });
    setLoading(false);
    if (error) setMessage(t("common.error"));
    else if (!data) setMessage(t("track.notFound"));
    else setOrder(data as TrackedOrder);
  }

  const stepIndex = order ? STEPS.indexOf(order.status as (typeof STEPS)[number]) : -1;
  const field = "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100";

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-bold">{tab === "order" ? t("track.title") : t("track.repairTitle")}</h1>
      <div className="mt-4 inline-flex rounded-md bg-slate-200 p-1 text-sm font-semibold" role="tablist">
        {(["order", "repair"] as const).map((k) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className={`rounded px-4 py-1.5 ${tab === k ? "bg-white text-brand-700 shadow" : "text-slate-600"}`}>
            {k === "order" ? `📦 ${t("track.tabOrder")}` : `🔧 ${t("track.tabRepair")}`}
          </button>
        ))}
      </div>
      {tab === "repair" ? <RepairTrack initialNumber={repairParam} /> : <>
      <form onSubmit={onSubmit} className="mt-6 grid gap-4 rounded-xl bg-white p-6 ring-1 ring-slate-200 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="text-sm font-medium">{t("success.orderNumber")}<input name="order" required placeholder="PD…" className={`${field} uppercase`} /></label>
        <label className="text-sm font-medium">{t("form.mobileNumber")}<input name="phone" required type="tel" inputMode="numeric" className={field} /></label>
        <button disabled={loading} className="rounded-lg bg-brand-600 px-5 py-2 font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
          {loading ? t("track.checking") : t("track.button")}
        </button>
      </form>

      {message && <p className="mt-6 rounded-lg bg-amber-50 p-4 text-sm text-amber-900" role="status">{message}</p>}

      {order && (
        <section className="mt-6 rounded-xl bg-white p-6 ring-1 ring-slate-200">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-mono text-lg font-bold">{order.order_number}</p>
            <p className="text-sm text-slate-500">
              {new Date(order.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          </div>
          {order.status === "cancelled" ? (
            <p className="mt-4 font-semibold text-red-600">{t("track.cancelled")}</p>
          ) : (
            <ol className="mt-6 grid grid-cols-5 gap-2 text-center text-xs">
              {STEPS.map((s, i) => (
                <li key={s}>
                  <div className={`h-2 rounded-full ${i <= stepIndex ? "bg-emerald-500" : "bg-slate-200"}`} />
                  <p className={`mt-2 ${i <= stepIndex ? "font-semibold text-emerald-700" : "text-slate-400"}`}>{t(`orderStatus.${s}`)}</p>
                </li>
              ))}
            </ol>
          )}
          {order.tracking_url && (
            <a href={order.tracking_url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
              {t("order.trackCourier")} <span className="inline-block rtl:-scale-x-100">→</span>
            </a>
          )}
          <ul className="mt-6 space-y-2 border-t border-slate-200 pt-4 text-sm">
            {order.items.map((i, idx) => (
              <li key={idx} className="flex justify-between gap-3">
                <span>{i.name} × {i.quantity}</span>
                <span>{formatINR(i.line_total)}</span>
              </li>
            ))}
            {Number(order.discount) > 0 && (
              <li className="flex justify-between text-emerald-700"><span>{t("cart.discount")}</span><span>− {formatINR(order.discount)}</span></li>
            )}
            <li className="flex justify-between"><span>{t("cart.shipping")}</span><span>{Number(order.shipping) === 0 ? t("cart.free") : formatINR(order.shipping)}</span></li>
            {Number(order.gst_amount ?? 0) > 0 && <li className="flex justify-between"><span>{t("cart.gst", { rate: Number(order.gst_rate) })}</span><span>{formatINR(Number(order.gst_amount))}</span></li>}
            <li className="flex justify-between border-t border-slate-200 pt-2 font-bold">
              <span>{t("track.totalCod")}</span>
              <span>{formatINR(order.total)}</span>
            </li>
          </ul>
        </section>
      )}
      </>}
    </div>
  );
}

function RepairTrack({ initialNumber }: { initialNumber: string }) {
  const { t } = useI18n();
  const [repair, setRepair] = useState<TrackedRepair | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const field = "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setLoading(true); setMessage(null); setRepair(null);
    const { data, error } = await getSupabase().rpc("track_repair", {
      p_request_number: String(form.get("repair") ?? "").trim(),
      p_phone: String(form.get("phone") ?? ""),
    });
    setLoading(false);
    if (error) setMessage(t("common.error"));
    else if (!data) setMessage(t("track.repairNotFound"));
    else setRepair(data as TrackedRepair);
  }

  return (
    <>
      <form onSubmit={onSubmit} className="mt-6 grid gap-4 rounded-xl bg-white p-6 ring-1 ring-slate-200 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="text-sm font-medium">{t("track.repairNumber")}<input name="repair" required defaultValue={initialNumber} placeholder="PR…" className={`${field} uppercase`} /></label>
        <label className="text-sm font-medium">{t("form.mobileNumber")}<input name="phone" required type="tel" inputMode="numeric" className={field} /></label>
        <button disabled={loading} className="rounded-lg bg-brand-600 px-5 py-2 font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
          {loading ? t("track.checking") : t("track.button")}
        </button>
      </form>
      {message && <p className="mt-6 rounded-lg bg-amber-50 p-4 text-sm text-amber-900" role="status">{message}</p>}
      {repair && (
        <section className="mt-6 rounded-xl bg-white p-6 ring-1 ring-slate-200">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-mono text-lg font-bold">{repair.request_number}</p>
            <p className="text-sm text-slate-500">{formatDate(repair.created_at)}</p>
          </div>
          <p className="mt-1 text-sm"><b>{repair.board_type}</b>{repair.device ? ` – ${repair.device}` : ""} × {repair.quantity}</p>
          {repair.quote_amount != null && (
            <p className="mt-3 rounded bg-brand-50 p-3 text-sm">{t("myRepairs.quote")}: <b className="text-lg text-brand-700">{formatINR(repair.quote_amount)}</b></p>
          )}
          <div className="mt-5"><RepairTimeline status={repair.status} history={repair.history} /></div>
        </section>
      )}
    </>
  );
}
