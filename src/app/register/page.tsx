"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase-browser";
import { AuthCard, authButton, authField } from "@/components/AuthCard";

export default function RegisterPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    if (password !== String(form.get("confirm"))) {
      setError("Passwords don't match.");
      return;
    }
    setBusy(true);
    setError(null);
    const { data, error } = await getSupabase().auth.signUp({
      email,
      password,
      options: {
        data: { full_name: String(form.get("name")).trim(), phone: String(form.get("phone")).trim() },
        emailRedirectTo: `${window.location.origin}/account`,
      },
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (data.session) router.replace("/account");
    else setSentTo(email);
  }

  if (sentTo) {
    return (
      <AuthCard title="Check your email">
        <p className="text-sm text-slate-700">
          We sent a confirmation link to <span className="font-semibold">{sentTo}</span>. Click it to activate your account, then log in.
        </p>
        <Link href="/login" className={`${authButton} mt-6 block text-center`}>Go to login</Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Create an account"
      subtitle="Save addresses, track orders and write reviews."
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
