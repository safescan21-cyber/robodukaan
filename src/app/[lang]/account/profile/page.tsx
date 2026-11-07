"use client";

import { useState } from "react";
import { getSupabase } from "@/lib/supabase-browser";
import { useAuth } from "@/components/AuthProvider";
import { Avatar } from "@/components/Avatar";
import { useI18n } from "@/i18n/client";
import { INDIAN_STATES } from "@/lib/constants";
import { removeUserPhoto, uploadUserPhoto } from "@/lib/user-photos";
import type { Profile } from "@/lib/types";

const field = "mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600";
const GSTIN_PATTERN = "[0-9]{2}[A-Za-z]{5}[0-9]{4}[A-Za-z][1-9A-Za-z][Zz][0-9A-Za-z]";

// Newer profile fields (migration 013) are only sent when used, so saving the name and mobile
// keeps working on a database without them.
function detailsPatch(values: Record<"company" | "gstin" | "city" | "state", string>, profile: Profile | null) {
  const patch: Partial<Record<keyof typeof values, string | null>> = {};
  for (const [k, v] of Object.entries(values) as [keyof typeof values, string][]) {
    if (v || profile?.[k]) patch[k] = v || null;
  }
  return patch;
}

export default function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const { t } = useI18n();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoMsg, setPhotoMsg] = useState<string | null>(null);

  async function saveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? "").trim();
    const { error } = await getSupabase().from("profiles")
      .update({
        full_name: get("full_name"),
        phone: get("phone") || null,
        ...detailsPatch({ company: get("company"), gstin: get("gstin").replace(/\s/g, "").toUpperCase(), city: get("city"), state: get("state") }, profile),
      })
      .eq("id", user.id);
    setMsg(error
      ? { ok: false, text: error.message.includes("gstin_format") ? t("profile.badGstin") : error.message }
      : { ok: true, text: t("profile.saved") });
    if (!error) refreshProfile();
  }

  async function changePhoto(file: File | undefined) {
    if (!file || !user) return;
    setPhotoBusy(true);
    setPhotoMsg(null);
    try {
      const url = await uploadUserPhoto(file, user.id, "avatar", 512);
      const { error } = await getSupabase().from("profiles").update({ avatar_url: url }).eq("id", user.id);
      if (error) throw new Error(error.message);
      await removeUserPhoto(profile?.avatar_url);
      refreshProfile();
    } catch (err) {
      setPhotoMsg(err instanceof Error ? err.message : t("common.error"));
    }
    setPhotoBusy(false);
  }

  async function removePhoto() {
    if (!user || !profile?.avatar_url) return;
    setPhotoBusy(true);
    const { error } = await getSupabase().from("profiles").update({ avatar_url: null }).eq("id", user.id);
    if (!error) {
      await removeUserPhoto(profile.avatar_url);
      refreshProfile();
    } else setPhotoMsg(error.message);
    setPhotoBusy(false);
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
      <section className="flex flex-wrap items-center gap-4 rounded-md bg-white p-5 ring-1 ring-slate-200">
        <Avatar url={profile?.avatar_url} name={profile?.full_name ?? user?.email} size={80} />
        <div className="space-y-2">
          <p className="font-bold">{t("profile.photo")}</p>
          <p className="text-xs text-slate-500">{t("profile.photoHint")}</p>
          <div className="flex flex-wrap items-center gap-3">
            <label className={`cursor-pointer rounded-md bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 ${photoBusy ? "pointer-events-none opacity-60" : ""}`}>
              {photoBusy ? t("common.saving") : profile?.avatar_url ? t("profile.changePhoto") : t("profile.addPhoto")}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => { changePhoto(e.target.files?.[0]); e.target.value = ""; }} />
            </label>
            {profile?.avatar_url && !photoBusy && (
              <button type="button" onClick={removePhoto} className="text-sm font-semibold text-red-600 hover:underline">{t("common.remove")}</button>
            )}
          </div>
          {photoMsg && <p className="text-sm text-red-600" role="alert">{photoMsg}</p>}
        </div>
      </section>

      <form onSubmit={saveProfile} className="space-y-4 rounded-md bg-white p-5 ring-1 ring-slate-200">
        <h1 className="text-lg font-bold">{t("account.details")}</h1>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium">{t("form.fullName")}<input name="full_name" required defaultValue={profile?.full_name ?? ""} autoComplete="name" className={field} /></label>
          <label className="text-sm font-medium">{t("form.mobile")}<input name="phone" defaultValue={profile?.phone ?? ""} pattern="[6-9][0-9]{9}" inputMode="tel" autoComplete="tel-national" className={field} /></label>
          <label className="text-sm font-medium sm:col-span-2">{t("form.email")}<input value={user?.email ?? ""} disabled className={`${field} bg-slate-100 text-slate-500`} /></label>
          <label className="text-sm font-medium">{t("form.city")}<input name="city" defaultValue={profile?.city ?? ""} maxLength={80} autoComplete="address-level2" className={field} /></label>
          <label className="text-sm font-medium">{t("form.state")}
            <select name="state" defaultValue={profile?.state ?? ""} className={field}>
              <option value="">{t("form.selectState")}</option>
              {INDIAN_STATES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
        </div>
        <div className="border-t border-slate-100 pt-4">
          <p className="text-sm font-bold">{t("profile.business")}</p>
          <p className="text-xs text-slate-500">{t("profile.businessHint")}</p>
          <div className="mt-2 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium">{t("checkout.company")}<input name="company" defaultValue={profile?.company ?? ""} maxLength={120} autoComplete="organization" className={field} /></label>
            <label className="text-sm font-medium">GSTIN<input name="gstin" defaultValue={profile?.gstin ?? ""} maxLength={15} pattern={GSTIN_PATTERN} title="15 characters, e.g. 27AAACR1234Q1Z5" placeholder="27AAACR1234Q1Z5" className={`${field} uppercase`} /></label>
          </div>
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
