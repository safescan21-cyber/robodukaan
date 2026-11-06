"use client";

import Link from "@/i18n/client";
import { useState } from "react";
import { useI18n, useRouter } from "@/i18n/client";
import { getSupabase } from "@/lib/supabase-browser";
import { useAuth } from "@/components/AuthProvider";
import { AuthCard, authButton, authField } from "@/components/AuthCard";

export default function ResetPasswordPage() {
  const { ready, user } = useAuth();
  const router = useRouter();
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password"));
    if (password !== String(form.get("confirm"))) {
      setError(t("register.mismatch"));
      return;
    }
    setBusy(true);
    setError(null);
    const { error } = await getSupabase().auth.updateUser({ password });
    setBusy(false);
    if (error) setError(error.message);
    else router.replace("/account");
  }

  if (ready && !user) {
    return (
      <AuthCard title={t("reset.expiredTitle")}>
        <p className="text-sm text-slate-700">{t("reset.expired")}</p>
        <Link href="/forgot-password" className={`${authButton} mt-6 block text-center`}>{t("reset.requestNew")}</Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={t("reset.title")}>
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block text-sm font-medium">{t("reset.new")}<input name="password" type="password" required minLength={8} autoComplete="new-password" className={authField} /></label>
        <label className="block text-sm font-medium">{t("reset.confirm")}<input name="confirm" type="password" required minLength={8} autoComplete="new-password" className={authField} /></label>
        {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
        <button disabled={busy || !ready} className={authButton}>{busy ? t("common.saving") : t("reset.save")}</button>
      </form>
    </AuthCard>
  );
}
