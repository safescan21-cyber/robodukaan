"use client";

import Link from "@/i18n/client";
import { useState } from "react";
import { getSupabase } from "@/lib/supabase-browser";
import { useI18n } from "@/i18n/client";
import { AuthCard, authButton, authField } from "@/components/AuthCard";

export default function ForgotPasswordPage() {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email"));
    setBusy(true);
    setError(null);
    const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <AuthCard title={t("forgot.title")} subtitle={t("forgot.subtitle")}
      footer={<Link href="/login" className="font-semibold text-brand-700 hover:underline">{t("forgot.back")}</Link>}>
      {sent ? (
        <p className="rounded bg-emerald-50 p-3 text-sm text-emerald-800">{t("forgot.sent")}</p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block text-sm font-medium">{t("form.emailAddress")}<input name="email" type="email" required autoComplete="email" className={authField} /></label>
          {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
          <button disabled={busy} className={authButton}>{busy ? t("common.sending") : t("forgot.send")}</button>
        </form>
      )}
    </AuthCard>
  );
}
