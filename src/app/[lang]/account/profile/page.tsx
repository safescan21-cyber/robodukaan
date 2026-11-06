"use client";

import { useState } from "react";
import { getSupabase } from "@/lib/supabase-browser";
import { useAuth } from "@/components/AuthProvider";
import { useI18n } from "@/i18n/client";

const field = "mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600";

export default function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const { t } = useI18n();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function saveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;
    const f = new FormData(e.currentTarget);
    const { error } = await getSupabase().from("profiles")
      .update({ full_name: String(f.get("full_name")).trim(), phone: String(f.get("phone")).trim() || null })
      .eq("id", user.id);
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: t("profile.saved") });
    if (!error) refreshProfile();
  }

  async function changePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const password = String(f.get("password"));
    if (password !== String(f.get("confirm"))) return setPwMsg({ ok: false, text: t("register.mismatch") });
    const { error } = await getSupabase().auth.updateUser({ password });
    setPwMsg(error ? { ok: false, text: error.message } : { ok: true, text: t("profile.pwChanged") });
    if (!error) form.reset();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={saveProfile} className="space-y-4 rounded-md bg-white p-5 ring-1 ring-slate-200">
        <h1 className="text-lg font-bold">{t("account.details")}</h1>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium">{t("form.fullName")}<input name="full_name" required defaultValue={profile?.full_name ?? ""} className={field} /></label>
          <label className="text-sm font-medium">{t("form.mobile")}<input name="phone" defaultValue={profile?.phone ?? ""} pattern="[6-9][0-9]{9}" className={field} /></label>
          <label className="text-sm font-medium sm:col-span-2">{t("form.email")}<input value={user?.email ?? ""} disabled className={`${field} bg-slate-100 text-slate-500`} /></label>
        </div>
        {msg && <p className={`text-sm ${msg.ok ? "text-emerald-700" : "text-red-600"}`}>{msg.text}</p>}
        <button className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">{t("profile.save")}</button>
      </form>
      <form onSubmit={changePassword} className="space-y-4 rounded-md bg-white p-5 ring-1 ring-slate-200">
        <h2 className="text-lg font-bold">{t("profile.changePw")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium">{t("reset.new")}<input name="password" type="password" required minLength={8} autoComplete="new-password" className={field} /></label>
          <label className="text-sm font-medium">{t("reset.confirm")}<input name="confirm" type="password" required minLength={8} autoComplete="new-password" className={field} /></label>
        </div>
        {pwMsg && <p className={`text-sm ${pwMsg.ok ? "text-emerald-700" : "text-red-600"}`}>{pwMsg.text}</p>}
        <button className="rounded-md bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">{t("profile.changePw")}</button>
      </form>
    </div>
  );
}
