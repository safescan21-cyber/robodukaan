"use client";

import Link from "next/link";
import { useState } from "react";
import { getSupabase } from "@/lib/supabase-browser";
import { AuthCard, authButton, authField } from "@/components/AuthCard";

export default function ForgotPasswordPage() {
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
    <AuthCard title="Forgot your password?" subtitle="Enter your email and we’ll send you a link to set a new one."
      footer={<Link href="/login" className="font-semibold text-brand-700 hover:underline">Back to login</Link>}>
      {sent ? (
        <p className="rounded bg-emerald-50 p-3 text-sm text-emerald-800">If an account exists for that email, a reset link is on its way. Check your inbox.</p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block text-sm font-medium">Email address<input name="email" type="email" required autoComplete="email" className={authField} /></label>
          {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
          <button disabled={busy} className={authButton}>{busy ? "Sending…" : "Send reset link"}</button>
        </form>
      )}
    </AuthCard>
  );
}
