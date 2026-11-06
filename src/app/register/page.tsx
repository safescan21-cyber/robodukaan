"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase-browser";
import { postAsUser } from "@/lib/api-client";
import { AuthCard, authButton, authField } from "@/components/AuthCard";
import { OtpInput } from "@/components/OtpInput";

export default function RegisterPage() {
  const router = useRouter();
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
      setError("Passwords don't match.");
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
      setError(/rate|seconds/i.test(error.message) ? "Too many attempts. Please wait a minute and try again." : error.message);
      return;
    }
    if (data.user && data.user.identities?.length === 0) {
      setError("An account with this email already exists. Please log in instead.");
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
      setError("That code is wrong or has expired. Check the latest email, or send a new code.");
      return;
    }
    await finish();
  }

  if (email) {
    return (
      <AuthCard title="Confirm your email" subtitle={`We sent a 6-digit code to ${email}.`}>
        <form onSubmit={verify} className="space-y-4">
          <label className="block text-sm font-medium">Verification code
            <OtpInput value={code} onChange={setCode} />
          </label>
          <p className="text-xs text-slate-500">It can take a minute to arrive — check spam too. If the email has a link instead, click it to confirm.</p>
          {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
          <button disabled={busy || code.length < 6} className={authButton}>{busy ? "Checking…" : "Confirm & continue"}</button>
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
            {resent ? "New code sent" : "Send a new code"}
          </button>
        </form>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Create an account"
      subtitle="Register to buy products, track orders and send PCBs for repair."
      footer={<>Already have an account? <Link href="/login" className="font-semibold text-brand-700 hover:underline">Log in</Link></>}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block text-sm font-medium">Full name<input name="name" required minLength={2} autoComplete="name" className={authField} /></label>
        <label className="block text-sm font-medium">Mobile number<input name="phone" type="tel" inputMode="numeric" pattern="[6-9][0-9]{9}" placeholder="10-digit mobile" autoComplete="tel" className={authField} /></label>
        <label className="block text-sm font-medium">Email address<input name="email" type="email" required autoComplete="email" className={authField} /></label>
        <label className="block text-sm font-medium">Password<input name="password" type="password" required minLength={8} autoComplete="new-password" className={authField} /></label>
        <label className="block text-sm font-medium">Confirm password<input name="confirm" type="password" required minLength={8} autoComplete="new-password" className={authField} /></label>
        {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
        <button disabled={busy} className={authButton}>{busy ? "Creating account…" : "Register"}</button>
      </form>
    </AuthCard>
  );
}
