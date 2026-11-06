"use client";

import Link from "@/i18n/client";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase-browser";
import { postAsUser } from "@/lib/api-client";
import { BOARD_TYPES } from "@/lib/constants";
import { useAuth } from "./AuthProvider";
import { useI18n } from "@/i18n/client";

const MAX_PHOTOS = 8;
const MAX_MB = 10;
const field = "mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100";

export function RepairForm() {
  const { ready, user, profile } = useAuth();
  const { t } = useI18n();
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- previews follow the chosen files
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  function addFiles(list: FileList | null) {
    if (!list) return;
    setError(null);
    const picked = Array.from(list).filter((f) => {
      if (!f.type.startsWith("image/")) { setError(t("repair.onlyPhotos")); return false; }
      if (f.size > MAX_MB * 1024 * 1024) { setError(t("repair.photoTooBig", { mb: MAX_MB })); return false; }
      return true;
    });
    setFiles((cur) => [...cur, ...picked].slice(0, MAX_PHOTOS));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;
    if (files.length === 0) return setError(t("repair.needPhoto"));
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    const supabase = getSupabase();
    const paths: string[] = [];
    try {
      for (let i = 0; i < files.length; i++) {
        setProgress(t("repair.uploading", { n: i + 1, total: files.length }));
        const file = files[i];
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
        const path = `${user.id}/${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
        const { error } = await supabase.storage.from("pcb-repairs").upload(path, file, { contentType: file.type, upsert: false });
        if (error) throw new Error(error.message);
        paths.push(path);
      }
      setProgress(t("repair.sending"));
      const { data, error } = await supabase
        .from("repair_requests")
        .insert({
          user_id: user.id,
          name: String(f.get("name")).trim(),
          phone: String(f.get("phone")).trim(),
          email: String(f.get("email")).trim() || null,
          board_type: String(f.get("board_type")),
          device: String(f.get("device")).trim() || null,
          problem: String(f.get("problem")).trim(),
          quantity: Number(f.get("quantity")) || 1,
          photos: paths,
        })
        .select("id, request_number")
        .single();
      if (error) throw new Error(error.message);
      await postAsUser("/api/email/repair", { requestId: data.id, kind: "received" });
      setDone(data.request_number);
    } catch (err) {
      if (paths.length) await supabase.storage.from("pcb-repairs").remove(paths);
      setError(err instanceof Error ? err.message : t("common.error"));
    }
    setBusy(false);
    setProgress(null);
  }

  if (!ready) return <div className="h-64 animate-pulse rounded-md bg-slate-100" />;

  if (!user) {
    return (
      <div className="rounded-md bg-white p-8 text-center ring-1 ring-slate-200">
        <p className="text-4xl" aria-hidden="true">🔒</p>
        <h3 className="mt-3 text-lg font-bold">{t("repair.loginTitle")}</h3>
        <p className="mt-1 text-sm text-slate-600">{t("repair.loginText")}</p>
        <div className="mt-5 flex justify-center gap-3">
          <Link href="/login?next=/pcb-repair" className="rounded-md bg-brand-600 px-5 py-2.5 font-semibold text-white hover:bg-brand-700">{t("auth.login")}</Link>
          <Link href="/register" className="rounded-md px-5 py-2.5 font-semibold text-brand-700 ring-1 ring-brand-600 hover:bg-brand-50">{t("auth.createAccount")}</Link>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="rounded-md bg-white p-8 text-center ring-1 ring-slate-200">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700" aria-hidden="true">✓</div>
        <h3 className="mt-4 text-xl font-bold">{t("repair.sentTitle")}</h3>
        <p className="mt-2 text-slate-700">{t("repair.requestNumber")} <span className="font-mono font-bold">{done}</span></p>
        <p className="mt-1 text-sm text-slate-600">{t("repair.sentText")}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/account/repairs" className="rounded-md bg-brand-600 px-5 py-2.5 font-semibold text-white hover:bg-brand-700">{t("repair.trackMine")}</Link>
          <button onClick={() => { setDone(null); setFiles([]); }} className="rounded-md px-5 py-2.5 font-semibold text-brand-700 ring-1 ring-brand-600 hover:bg-brand-50">{t("repair.another")}</button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-md bg-white p-5 ring-1 ring-slate-200 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">{t("form.yourName")} *<input name="name" required minLength={2} defaultValue={profile?.full_name ?? ""} className={field} /></label>
        <label className="text-sm font-medium">{t("form.mobileWhatsapp")} *<input name="phone" required type="tel" pattern="(\+?91)?[6-9][0-9]{9}" defaultValue={profile?.phone ?? ""} className={field} /></label>
        <label className="text-sm font-medium sm:col-span-2">{t("repair.emailForQuote")}<input name="email" type="email" defaultValue={user.email ?? ""} className={field} /></label>
        <label className="text-sm font-medium">{t("repair.boardType")} *
          <select name="board_type" required defaultValue="" className={field}>
            <option value="" disabled>{t("common.select")}</option>
            {BOARD_TYPES.map((b, i) => <option key={b} value={b}>{t(`board.${i}`)}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium">{t("form.quantity")}<input name="quantity" type="number" min={1} max={1000} defaultValue={1} className={field} /></label>
        <label className="text-sm font-medium sm:col-span-2">{t("repair.device")}<input name="device" placeholder={t("repair.devicePh")} className={field} /></label>
        <label className="text-sm font-medium sm:col-span-2">{t("repair.problem")} *
          <textarea name="problem" required minLength={5} maxLength={3000} rows={4} placeholder={t("repair.problemPh")} className={field} />
        </label>
      </div>

      <div>
        <p className="text-sm font-medium">{t("repair.photos")} * <span className="font-normal text-slate-500">{t("repair.photosHint", { max: MAX_PHOTOS })}</span></p>
        <div className="mt-2 flex flex-wrap gap-3">
          {previews.map((src, i) => (
            <div key={src} className="relative h-24 w-24 overflow-hidden rounded border border-slate-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={t("repair.photoN", { n: i + 1 })} className="h-full w-full object-cover" />
              <button type="button" onClick={() => setFiles((cur) => cur.filter((_, j) => j !== i))} className="absolute end-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs text-white" aria-label={t("repair.removePhoto", { n: i + 1 })}>✕</button>
            </div>
          ))}
          {files.length < MAX_PHOTOS && (
            <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center rounded border-2 border-dashed border-slate-300 text-center text-xs text-slate-500 hover:border-brand-600 hover:text-brand-700">
              <span className="text-2xl" aria-hidden="true">📷</span>{t("repair.addPhotos")}
              <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
            </label>
          )}
        </div>
      </div>

      {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
      <button disabled={busy} className="w-full rounded-md bg-accent-500 px-4 py-3 font-bold uppercase tracking-wide text-white hover:bg-accent-600 disabled:opacity-60 sm:w-auto sm:px-10">
        {busy ? progress ?? t("common.sending") : t("repair.send")}
      </button>
      <p className="text-xs text-slate-500">{t("repair.freeNote")}</p>
    </form>
  );
}
