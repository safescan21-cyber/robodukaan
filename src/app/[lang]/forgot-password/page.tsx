"use client";

import Link from "@/i18n/client";
import { useState } from "react";
import { getSupabase } from "@/lib/supabase-browser";
import { useI18n, useRouter } from "@/i18n/client";
import { AuthCard, authButton, authField } from "@/components/AuthCard";
import { OtpInput } from "@/components/OtpInput";

// Forgot password: 1) email → Supabase sends an email with a 6-digit code and a link,
// 2) type the code + new password here (works on any device), or use the link (→ /reset-password).
export default function ForgotPasswordPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [code, setCode] = useState("");

  async function sendCode(address: string) {
    setBusy(true); setError(null); setInfo(null);
    const { error } = await getSupabase().auth.resetPasswordForEmail(address, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) {
      setError(/rate|seconds|too many/i.test(error.message) ? t("forgot.wait") : error.message);
      return false;
    }
    setEmail(address);
    return true;
  }

  async function onEmail(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await sendCode(String(new FormData(e.currentTarget).get("email")).trim());
  }

  async function onReset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email) return;
    const f = new FormData(e.currentTarget);
    const password = String(f.get("password"));
    if (password !== String(f.get("confirm"))) return setError(t("register.mismatch"));
    setBusy(true); setError(null);
    const supabase = getSupabase();
    const { error: codeError } = await supabase.auth.verifyOtp({ email, token: code, type: "recovery" });
    if (codeError) {
      setBusy(false);
      setCode("");
      return setError(t("forgot.badCode"));
    }
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return setError(/different from the old|same password/i.test(error.message) ? t("forgot.samePassword") : error.message);
    router.replace("/account");
  }

  return (
    <AuthCard title={email ? t("reset.title") : t("forgot.title")} subtitle={email ? t("forgot.codeSent", { email }) : t("forgot.subtitle")}
      footer={<Link href="/login" className="font-semibold text-brand-700 hover:underline">{t("forgot.back")}</Link>}>
      {!email ? (
        <form onSubmit={onEmail} className="space-y-4">
          <label className="block text-sm font-medium">{t("form.emailAddress")}<input name="email" type="email" required autoComplete="email" className={authField} /></label>
          {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
          <button disabled={busy} className={authButton}>{busy ? t("common.sending") : t("forgot.sendCode")}</button>
        </form>
      ) : (
        <form onSubmit={onReset} className="space-y-4">
          <label className="block text-sm font-medium">{t("forgot.code")}
            <OtpInput value={code} onChange={setCode} />
          </label>
          <label className="block text-sm font-medium">{t("reset.new")}<input name="password" type="password" required minLength={8} autoComplete="new-password" className={authField} /></label>
          <label className="block text-sm font-medium">{t("reset.confirm")}<input name="confirm" type="password" required minLength={8} autoComplete="new-password" className={authField} /></label>
          {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
          {info && <p className="rounded bg-emerald-50 p-3 text-sm text-emerald-800" role="status">{info}</p>}
          <button disabled={busy || code.length < 6} className={authButton}>{busy ? t("common.saving") : t("reset.save")}</button>
          <div className="flex flex-wrap justify-between gap-2 text-sm">
            <button type="button" onClick={() => { setEmail(null); setError(null); setCode(""); }} className="text-slate-600 hover:underline">{t("login.changeEmail")}</button>
            <button type="button" disabled={busy} onClick={async () => { if (await sendCode(email)) setInfo(t("forgot.resent")); }} className="font-semibold text-brand-700 hover:underline">{t("login.newCode")}</button>
          </div>
          <p className="text-xs text-slate-500">{t("forgot.spamHint")}</p>
        </form>
      )}
    </AuthCard>
  );
}
