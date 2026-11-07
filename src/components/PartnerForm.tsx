"use client";

import { useState } from "react";
import { useI18n } from "@/i18n/client";
import { useAuth } from "./AuthProvider";
import { getSupabase } from "@/lib/supabase-browser";
import { INDIAN_STATES } from "@/lib/constants";

// Technician partner application (guests allowed). Sends to /api/partner.
export function PartnerForm() {
  const { t } = useI18n();
  const { user, profile } = useAuth();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSending(true);
    setError(null);
    const f = new FormData(e.currentTarget);
    const body = Object.fromEntries(["name", "business_name", "phone", "email", "city", "state", "experience", "message"].map((k) => [k, String(f.get(k) ?? "")]));
    const { data } = await getSupabase().auth.getSession().catch(() => ({ data: { session: null } }));
    const token = data.session?.access_token;
    try {
      const res = await fetch("/api/partner", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || t("common.error"));
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
    setSending(false);
  }

  const field = "mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100";

  if (done) {
    return (
      <div className="rounded-md bg-emerald-50 p-4 text-sm text-emerald-900 ring-1 ring-emerald-200" role="status">
        <p className="font-bold">✓ Application received</p>
        <p className="mt-1">Thank you! We’ll call or WhatsApp you within a few working days.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-md bg-white p-5 ring-1 ring-slate-200">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-medium">{t("form.yourName")} *<input name="name" required minLength={2} maxLength={100} defaultValue={profile?.full_name ?? ""} autoComplete="name" className={field} /></label>
        <label className="text-sm font-medium">Shop / business name<input name="business_name" maxLength={120} defaultValue={profile?.company ?? ""} autoComplete="organization" className={field} /></label>
        <label className="text-sm font-medium">{t("form.mobileWhatsapp")} *<input name="phone" type="tel" required inputMode="tel" pattern="[+0-9 ]{10,15}" defaultValue={profile?.phone ?? ""} autoComplete="tel" placeholder={t("form.mobilePh")} className={field} /></label>
        <label className="text-sm font-medium">{t("form.email")}<input name="email" type="email" maxLength={200} defaultValue={user?.email ?? ""} autoComplete="email" className={field} /></label>
        <label className="text-sm font-medium">{t("form.city")} *<input name="city" required minLength={2} maxLength={80} defaultValue={profile?.city ?? ""} autoComplete="address-level2" className={field} /></label>
        <label className="text-sm font-medium">{t("form.state")}
          <select name="state" defaultValue={profile?.state ?? ""} className={field}>
            <option value="">{t("form.selectState")}</option>
            {INDIAN_STATES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium sm:col-span-2">Experience and boards you repair
          <input name="experience" maxLength={500} placeholder="e.g. 8 years, VFDs and SMPS, mostly Delta and Siemens" className={field} />
        </label>
        <label className="text-sm font-medium sm:col-span-2">Anything else?<textarea name="message" rows={3} maxLength={2000} placeholder="Areas you cover, factories you work with, tools you have…" className={field} /></label>
      </div>
      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
      <button disabled={sending} className="w-full rounded-md bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
        {sending ? t("common.sending") : "Apply to become a partner"}
      </button>
    </form>
  );
}
