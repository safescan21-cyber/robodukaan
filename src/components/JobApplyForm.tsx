"use client";

import Link from "@/i18n/client";
import { useState } from "react";
import { getSupabase } from "@/lib/supabase-browser";
import { postAsUser } from "@/lib/api-client";
import { useAuth } from "./AuthProvider";
import { useI18n } from "@/i18n/client";

const field = "mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100";
const MAX_MB = 5;

export function JobApplyForm({ jobId, jobTitle, slug }: { jobId: string; jobTitle: string; slug: string }) {
  const { ready, user, profile } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!ready) return <div className="h-64 animate-pulse rounded-md bg-slate-100" />;

  if (!user) {
    return (
      <div className="rounded-md bg-white p-6 text-center ring-1 ring-slate-200">
        <h2 className="text-lg font-bold">{t("jobs.apply")}</h2>
        <p className="mt-1 text-sm text-slate-600">{t("jobs.loginToApply")}</p>
        <div className="mt-4 flex justify-center gap-2">
          <Link href={`/login?next=/careers/${slug}`} className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">{t("auth.login")}</Link>
          <Link href="/register" className="rounded-md px-4 py-2 text-sm font-semibold text-brand-700 ring-1 ring-brand-600 hover:bg-brand-50">{t("auth.register")}</Link>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="rounded-md bg-white p-6 text-center ring-1 ring-slate-200">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-xl text-emerald-700" aria-hidden="true">✓</div>
        <h2 className="mt-3 text-lg font-bold">{t("jobs.sent")}</h2>
        <p className="mt-1 text-sm text-slate-600">{t("jobs.sentText", { title: jobTitle })}</p>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    const supabase = getSupabase();
    let resume_path: string | null = null;
    try {
      if (file) {
        const ext = (file.name.split(".").pop() || "pdf").toLowerCase().replace(/[^a-z0-9]/g, "");
        resume_path = `${user.id}/${Date.now()}-${slug}.${ext}`;
        const { error } = await supabase.storage.from("resumes").upload(resume_path, file, { contentType: file.type || "application/octet-stream" });
        if (error) throw new Error(error.message);
      }
      const { data, error } = await supabase
        .from("job_applications")
        .insert({
          job_id: jobId,
          user_id: user.id,
          name: String(f.get("name")).trim(),
          email: String(f.get("email")).trim(),
          phone: String(f.get("phone")).trim(),
          experience: String(f.get("experience")).trim() || null,
          message: String(f.get("message")).trim() || null,
          resume_path,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message.includes("duplicate") ? t("jobs.already") : error.message);
      await postAsUser("/api/email/job", { applicationId: data.id });
      setDone(true);
    } catch (err) {
      if (resume_path) await supabase.storage.from("resumes").remove([resume_path]);
      setError(err instanceof Error ? err.message : t("common.error"));
    }
    setBusy(false);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-md bg-white p-5 ring-1 ring-slate-200">
      <h2 className="text-lg font-bold">{t("jobs.apply")}</h2>
      <label className="block text-sm font-medium">{t("form.fullName")} *<input name="name" required minLength={2} defaultValue={profile?.full_name ?? ""} className={field} /></label>
      <label className="block text-sm font-medium">{t("form.email")} *<input name="email" type="email" required defaultValue={user.email ?? ""} className={field} /></label>
      <label className="block text-sm font-medium">{t("form.mobile")} *<input name="phone" type="tel" required pattern="(\+?91)?[6-9][0-9]{9}" defaultValue={profile?.phone ?? ""} className={field} /></label>
      <label className="block text-sm font-medium">{t("jobs.experience")}<input name="experience" placeholder={t("jobs.experiencePh")} className={field} /></label>
      <label className="block text-sm font-medium">{t("jobs.whyFit")}<textarea name="message" rows={4} maxLength={2000} className={field} /></label>
      <label className="block text-sm font-medium">{t("jobs.cv", { mb: MAX_MB })}
        <input
          type="file"
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={(e) => {
            const picked = e.target.files?.[0] ?? null;
            if (picked && picked.size > MAX_MB * 1024 * 1024) { setError(t("jobs.cvTooBig", { mb: MAX_MB })); e.target.value = ""; return; }
            setError(null);
            setFile(picked);
          }}
          className={field}
        />
      </label>
      {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
      <button disabled={busy} className="w-full rounded-md bg-accent-500 py-2.5 font-bold text-white hover:bg-accent-600 disabled:opacity-60">{busy ? t("common.sending") : t("jobs.submit")}</button>
    </form>
  );
}
