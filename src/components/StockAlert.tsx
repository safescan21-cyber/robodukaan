"use client";

import { useState } from "react";
import { useI18n } from "@/i18n/client";
import { useAuth } from "./AuthProvider";

// Out of stock: leave an email, get notified when the admin restocks (emails sent by /api/revalidate).
export function StockAlert({ productId }: { productId: string }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const email = String(new FormData(e.currentTarget).get("email") ?? "");
    const res = await fetch("/api/stock-alert", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId, email }) }).catch(() => null);
    const json = await res?.json().catch(() => ({}));
    setBusy(false);
    if (res?.ok) setDone(true);
    else setError(json?.error ?? t("common.error"));
  }

  if (done) return <p className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-900 ring-1 ring-emerald-200" role="status">✓ {t("stock.done")}</p>;
  return (
    <form onSubmit={submit} className="rounded-md bg-amber-50 p-3 ring-1 ring-amber-200">
      <p className="text-sm font-semibold text-amber-900">🔔 {t("stock.title")}</p>
      <div className="mt-2 flex gap-2">
        <label htmlFor="stock-email" className="sr-only">{t("form.email")}</label>
        <input id="stock-email" name="email" type="email" required defaultValue={user?.email ?? ""} placeholder={t("form.emailAddress")}
          className="min-w-0 flex-1 rounded border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-brand-600" />
        <button disabled={busy} className="shrink-0 rounded bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60">{t("stock.button")}</button>
      </div>
      {error && <p className="mt-1 text-xs text-red-600" role="alert">{error}</p>}
    </form>
  );
}
