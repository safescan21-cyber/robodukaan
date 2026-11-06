"use client";

import Link from "@/i18n/client";
import { useState } from "react";
import { useI18n, useRouter } from "@/i18n/client";
import { getSupabase } from "@/lib/supabase-browser";
import { postAsUser } from "@/lib/api-client";
import { AuthCard, authButton, authField } from "@/components/AuthCard";
import { OtpInput } from "@/components/OtpInput";

export default function RegisterPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [resent, setResent] = useState(false);

  async function finish() {
    await postAsUser("/api/email/welcome");
    router.replace("/account");
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const address = String(form.get("email")).trim();
    const password = String(form.get("password"));
    if (password !== String(form.get("confirm"))) {
      setError(t("register.mismatch"));
      return;
    }
    setBusy(true);
    setError(null);
    const { data, error } = await getSupabase().auth.signUp({
      email: address,
      password,
      options: {
        data: { full_name: String(form.get("name")).trim(), phone: String(form.get("phone")).trim() },
        emailRedirectTo: `${window.location.origin}/account`,
      },
    });
    setBusy(false);
    if (error) {
      setError(/rate|seconds/i.test(error.message) ? t("register.tooMany") : error.message);
      return;
    }
    if (data.user && data.user.identities?.length === 0) {
      setError(t("register.exists"));
      return;
    }
    if (data.session) return finish();
    setEmail(address);
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setBusy(true);
    setError(null);
    const supabase = getSupabase();
    let { error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
    if (error) ({ error } = await supabase.auth.verifyOtp({ email, token: code, type: "signup" }));
    setBusy(false);
    if (error) {
      setError(t("login.badCode"));
      return;
    }
    await finish();
  }

  if (email) {
    return (
      <AuthCard title={t("register.confirmTitle")} subtitle={t("register.codeSentTo", { email })}>
        <form onSubmit={verify} className="space-y-4">
          <label className="block text-sm font-medium">{t("auth.code")}
            <OtpInput value={code} onChange={setCode} />
          </label>
          <p className="text-xs text-slate-500">{t("register.codeHint")}</p>
          {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
          <button disabled={busy || code.length < 6} className={authButton}>{busy ? t("track.checking") : t("register.confirm")}</button>
          <button
            type="button"
            disabled={resent}
            onClick={async () => {
              const { error } = await getSupabase().auth.resend({ type: "signup", email, options: { emailRedirectTo: `${window.location.origin}/account` } });
              if (error) setError(error.message);
              else setResent(true);
            }}
            className="w-full text-center text-sm font-semibold text-brand-700 hover:underline disabled:text-slate-400 disabled:no-underline"
          >
            {resent ? t("register.resent") : t("login.newCode")}
          </button>
        </form>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title={t("auth.createAccountLong")}
      subtitle={t("register.subtitle")}
      footer={<>{t("register.haveAccount")} <Link href="/login" className="font-semibold text-brand-700 hover:underline">{t("auth.login")}</Link></>}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block text-sm font-medium">{t("form.fullName")}<input name="name" required minLength={2} autoComplete="name" className={authField} /></label>
        <label className="block text-sm font-medium">{t("form.mobileNumber")}<input name="phone" type="tel" inputMode="numeric" pattern="[6-9][0-9]{9}" placeholder={t("form.mobilePh")} autoComplete="tel" className={authField} /></label>
        <label className="block text-sm font-medium">{t("form.emailAddress")}<input name="email" type="email" required autoComplete="email" className={authField} /></label>
        <label className="block text-sm font-medium">{t("login.tabPassword")}<input name="password" type="password" required minLength={8} autoComplete="new-password" className={authField} /></label>
        <label className="block text-sm font-medium">{t("register.confirmPassword")}<input name="confirm" type="password" required minLength={8} autoComplete="new-password" className={authField} /></label>
        {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
        <button disabled={busy} className={authButton}>{busy ? t("register.creating") : t("auth.register")}</button>
      </form>
    </AuthCard>
  );
}
