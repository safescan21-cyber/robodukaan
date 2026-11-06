"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase-browser";
import { safeNextPath } from "@/lib/next-path";
import { AuthCard, authButton, authField } from "@/components/AuthCard";

export default function LoginPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    const { error } = await getSupabase().auth.signInWithPassword({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    setBusy(false);
    if (error) {
      setError(error.message === "Email not confirmed"
        ? "Please confirm your email first — check your inbox for the link we sent."
        : "Wrong email or password.");
      return;
    }
    router.replace(safeNextPath());
  }

  return (
    <AuthCard
      title="Login"
      subtitle="Welcome back! Log in to track orders and check out faster."
      footer={<>New to RoboDukaan? <Link href="/register" className="font-semibold text-brand-700 hover:underline">Create an account</Link></>}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block text-sm font-medium">Email address<input name="email" type="email" required autoComplete="email" className={authField} /></label>
        <label className="block text-sm font-medium">Password<input name="password" type="password" required autoComplete="current-password" className={authField} /></label>
        <div className="text-right text-sm"><Link href="/forgot-password" className="text-brand-700 hover:underline">Forgot password?</Link></div>
        {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
        <button disabled={busy} className={authButton}>{busy ? "Logging in…" : "Log in"}</button>
      </form>
    </AuthCard>
  );
}
