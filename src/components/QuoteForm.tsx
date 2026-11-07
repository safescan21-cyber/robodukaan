"use client";

import { useState } from "react";
import { useI18n } from "@/i18n/client";
import { useAuth } from "./AuthProvider";
import { getSupabase } from "@/lib/supabase-browser";

// Bulk quote request (guests allowed). On a product page it starts as a button; on /bulk-quote it's open.
export function QuoteForm({ productId, productName, startOpen = false }: { productId?: string; productName?: string; startOpen?: boolean }) {
  const { t } = useI18n();
  const { user, profile } = useAuth();
  const [open, setOpen] = useState(startOpen);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSending(true);
    setError(null);
    const f = new FormData(e.currentTarget);
    const body = Object.fromEntries(["product_name", "quantity", "name", "company", "gstin", "phone", "email", "city", "message"].map((k) => [k, String(f.get(k) ?? "")]));
    const { data } = await getSupabase().auth.getSession().catch(() => ({ data: { session: null } }));
    const token = data.session?.access_token;
    try {
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ ...body, product_id: productId ?? "" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || t("common.error"));
      setDone(json.quote_number);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
    setSending(false);
  }

  const field = "mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100";

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="w-full rounded-md border-2 border-dashed border-brand-600 px-4 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-50">
        📦 {t("quote.button")}
      </button>
    );
  }

  if (done) {
    return (
      <div className="rounded-md bg-emerald-50 p-4 text-sm text-emerald-900 ring-1 ring-emerald-200" role="status">
        <p className="font-bold">✓ {t("quote.sentTitle")}</p>
        <p className="mt-1">{t("quote.sentText", { number: done })}</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-md bg-slate-50 p-4 ring-1 ring-slate-200">
      <div>
        <p className="font-bold">{t("quote.title")}</p>
        <p className="text-xs text-slate-600">{t("quote.intro")}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-medium sm:col-span-2">{t("cart.product")} *
          <input name="product_name" required defaultValue={productName ?? ""} readOnly={!!productName} maxLength={200} className={`${field} ${productName ? "bg-slate-100" : ""}`} />
        </label>
        <label className="text-sm font-medium">{t("form.quantity")} *<input name="quantity" type="number" min={1} max={100000} required defaultValue={productName ? 10 : undefined} className={field} /></label>
        <label className="text-sm font-medium">{t("form.yourName")} *<input name="name" required minLength={2} maxLength={100} defaultValue={profile?.full_name ?? ""} autoComplete="name" className={field} /></label>
        <label className="text-sm font-medium">{t("form.mobileWhatsapp")} *<input name="phone" type="tel" required inputMode="tel" pattern="[+0-9 ]{10,15}" defaultValue={profile?.phone ?? ""} autoComplete="tel" placeholder={t("form.mobilePh")} className={field} /></label>
        <label className="text-sm font-medium">{t("form.email")}<input name="email" type="email" maxLength={200} defaultValue={user?.email ?? ""} autoComplete="email" className={field} /></label>
        <label className="text-sm font-medium">{t("checkout.company")}<input name="company" maxLength={120} autoComplete="organization" className={field} /></label>
        <label className="text-sm font-medium">GSTIN<input name="gstin" maxLength={15} pattern="[0-9]{2}[A-Za-z]{5}[0-9]{4}[A-Za-z][1-9A-Za-z][Zz][0-9A-Za-z]" title="15 characters, e.g. 27AAACR1234Q1Z5" className={`${field} uppercase`} /></label>
        <label className="text-sm font-medium sm:col-span-2">{t("form.city")}<input name="city" maxLength={80} className={field} /></label>
        <label className="text-sm font-medium sm:col-span-2">{t("quote.message")}<textarea name="message" rows={3} maxLength={2000} placeholder={t("quote.messagePh")} className={field} /></label>
      </div>
      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
      <button disabled={sending} className="w-full rounded-md bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
        {sending ? t("common.sending") : t("quote.submit")}
      </button>
    </form>
  );
}
