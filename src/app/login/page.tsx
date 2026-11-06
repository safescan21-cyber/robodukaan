"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase-browser";
import { safeNextPath } from "@/lib/next-path";
import { AuthCard, authButton, authField } from "@/components/AuthCard";
import { OtpInput } from "@/components/OtpInput";

type Mode = "code" | "password";

export default function LoginPage() {
  const router = useRouter();
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
      if (/signups? not allowed|not found|user/i.test(error.message)) setError("No account uses this email yet. Please register first.");
      else if (/email rate limit/i.test(error.message)) setError("We can't send more login emails right now. Please try again later, or use the Password tab.");
      else if (/rate|seconds|too many/i.test(error.message)) setError("Please wait a minute before asking for another code.");
      else setError(error.message);
      return;
    }
    setCodeSent(true);
    setCode("");
    setInfo(`We sent a login code to ${email.trim()}. It can take a minute to arrive — check your spam folder too.`);
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await getSupabase().auth.verifyOtp({ email: email.trim(), token: code, type: "email" });
    setBusy(false);
    if (error) {
      setError("That code is wrong or has expired. Check the latest email, or send a new code.");
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
        ? "Please confirm your email first — use the code we sent when you registered, or log in with an email code."
        : "Wrong email or password.");
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
      title="Login"
      subtitle="Log in to buy, track orders and send PCBs for repair."
      footer={<>New to PCBDukaan? <Link href="/register" className="font-semibold text-brand-700 hover:underline">Create an account</Link></>}
    >
      {blocked && (
        <p className="-mt-2 mb-4 rounded bg-red-50 p-3 text-sm text-red-700" role="alert">
          This account has been blocked. If you think this is a mistake, please email support.
        </p>
      )}
      <div className="-mt-2 mb-5 flex">{tab("code", "Email code")}{tab("password", "Password")}</div>

      {mode === "code" ? (
        !codeSent ? (
          <form onSubmit={sendCode} className="space-y-4">
            <label className="block text-sm font-medium">Email address
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required autoComplete="email" className={authField} />
            </label>
            {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
            <button disabled={busy} className={authButton}>{busy ? "Sending…" : "Send login code"}</button>
            <p className="text-center text-xs text-slate-500">We’ll email you a 6-digit code. No password needed.</p>
          </form>
        ) : (
          <form onSubmit={verifyCode} className="space-y-4">
            {info && <p className="rounded bg-emerald-50 p-3 text-sm text-emerald-800" role="status">{info}</p>}
            <label className="block text-sm font-medium">Enter the code from the email
              <OtpInput value={code} onChange={setCode} />
            </label>
            <p className="text-xs text-slate-500">If the email has a link instead of a code, just click the link.</p>
            {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
            <button disabled={busy || code.length < 6} className={authButton}>{busy ? "Checking…" : "Log in"}</button>
            <div className="flex justify-between text-sm">
              <button type="button" onClick={() => { setCodeSent(false); setError(null); }} className="text-slate-600 hover:underline">← Change email</button>
              <button type="button" onClick={() => sendCode()} disabled={busy} className="font-semibold text-brand-700 hover:underline">Send a new code</button>
            </div>
          </form>
        )
      ) : (
        <form onSubmit={passwordLogin} className="space-y-4">
          <label className="block text-sm font-medium">Email address<input name="email" type="email" required autoComplete="email" defaultValue={email} className={authField} /></label>
          <label className="block text-sm font-medium">Password<input name="password" type="password" required autoComplete="current-password" className={authField} /></label>
          <div className="text-right text-sm"><Link href="/forgot-password" className="text-brand-700 hover:underline">Forgot password?</Link></div>
          {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
          <button disabled={busy} className={authButton}>{busy ? "Logging in…" : "Log in"}</button>
        </form>
      )}
    </AuthCard>
  );
}
