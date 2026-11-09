"use client";

import Link from "@/i18n/client";
import { useState } from "react";
import { useI18n, useRouter } from "@/i18n/client";
import { getSupabase } from "@/lib/supabase-browser";
import { safeNextPath } from "@/lib/next-path";
import { AuthCard, authButton, authField } from "@/components/AuthCard";
import { OtpInput } from "@/components/OtpInput";

type Mode = "code" | "password";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [mode, setMode] = useState<Mode>("code");
  const [email, setEmail] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [blocked] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("blocked") === "1");

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    const { error } = await getSupabase().auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}${safeNextPath()}` },
    });
    setBusy(false);
    if (error) {
      if (/signups? not allowed|not found|user/i.test(error.message)) setError(t("login.noAccount"));
      else if (/email rate limit/i.test(error.message)) setError(t("login.emailLimit"));
      else if (/rate|seconds|too many/i.test(error.message)) setError(t("login.waitMinute"));
      else setError(error.message);
      return;
    }
    setCodeSent(true);
    setCode("");
    setInfo(t("login.codeSent", { email: email.trim() }));
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await getSupabase().auth.verifyOtp({ email: email.trim(), token: code, type: "email" });
    setBusy(false);
    if (error) {
      setError(t("login.badCode"));
      return;
    }
    router.replace(safeNextPath());
  }

  async function passwordLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    const { error } = await getSupabase().auth.signInWithPassword({
      email: String(form.get("email")).trim(),
      password: String(form.get("password")),
    });
    setBusy(false);
    if (error) {
      setError(error.message === "Email not confirmed"
        ? t("login.notConfirmed")
        : t("login.wrongPassword"));
      return;
    }
    router.replace(safeNextPath());
  }

  const tab = (m: Mode, label: string) => (
    <button
      type="button"
      onClick={() => { setMode(m); setError(null); setInfo(null); }}
      className={`flex-1 border-b-2 py-2 text-sm font-semibold ${mode === m ? "border-accent-500 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-800"}`}
    >
      {label}
    </button>
  );

  return (
    <AuthCard
      title={t("auth.login")}
      subtitle={t("login.subtitle")}
      footer={<>{t("login.newHere")} <Link href="/register" className="font-semibold text-brand-700 hover:underline">{t("auth.createAccountLong")}</Link></>}
    >
      {blocked && (
        <p className="-mt-2 mb-4 rounded bg-red-50 p-3 text-sm text-red-700" role="alert">
          {t("login.blocked")}
        </p>
      )}
      <div className="-mt-2 mb-5 flex">{tab("code", t("login.tabCode"))}{tab("password", t("login.tabPassword"))}</div>

      {mode === "code" ? (
        !codeSent ? (
          <form onSubmit={sendCode} className="space-y-4">
            <label className="block text-sm font-medium">{t("form.emailAddress")}
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required autoComplete="email" className={authField} />
            </label>
            {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
            <button disabled={busy} className={authButton}>{busy ? t("common.sending") : t("login.sendCode")}</button>
            <p className="text-center text-xs text-slate-500">{t("login.codeHint")}</p>
            <p className="text-center text-sm"><Link href="/forgot-password" className="text-brand-700 hover:underline">{t("login.forgot")}</Link></p>
          </form>
        ) : (
          <form onSubmit={verifyCode} className="space-y-4">
            {info && <p className="rounded bg-emerald-50 p-3 text-sm text-emerald-800" role="status">{info}</p>}
            <label className="block text-sm font-medium">{t("login.enterCode")}
              <OtpInput value={code} onChange={setCode} />
            </label>
            <p className="text-xs text-slate-500">{t("login.linkHint")}</p>
            {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
            <button disabled={busy || code.length < 6} className={authButton}>{busy ? t("track.checking") : t("auth.login")}</button>
            <div className="flex justify-between text-sm">
              <button type="button" onClick={() => { setCodeSent(false); setError(null); }} className="text-slate-600 hover:underline"><span className="inline-block rtl:-scale-x-100">←</span> {t("login.changeEmail")}</button>
              <button type="button" onClick={() => sendCode()} disabled={busy} className="font-semibold text-brand-700 hover:underline">{t("login.newCode")}</button>
            </div>
          </form>
        )
      ) : (
        <form onSubmit={passwordLogin} className="space-y-4">
          <label className="block text-sm font-medium">{t("form.emailAddress")}<input name="email" type="email" required autoComplete="email" defaultValue={email} className={authField} /></label>
          <label className="block text-sm font-medium">{t("login.tabPassword")}<input name="password" type="password" required autoComplete="current-password" className={authField} /></label>
          <div className="text-end text-sm"><Link href="/forgot-password" className="text-brand-700 hover:underline">{t("login.forgot")}</Link></div>
          {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
          <button disabled={busy} className={authButton}>{busy ? t("login.loggingIn") : t("auth.login")}</button>
        </form>
      )}
    </AuthCard>
  );
}
