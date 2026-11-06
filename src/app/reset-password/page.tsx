"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase-browser";
import { useAuth } from "@/components/AuthProvider";
import { AuthCard, authButton, authField } from "@/components/AuthCard";

export default function ResetPasswordPage() {
  const { ready, user } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password"));
    if (password !== String(form.get("confirm"))) {
      setError("Passwords don't match.");
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
      <AuthCard title="Link expired">
        <p className="text-sm text-slate-700">This password reset link is invalid or has expired.</p>
        <Link href="/forgot-password" className={`${authButton} mt-6 block text-center`}>Request a new link</Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Set a new password">
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block text-sm font-medium">New password<input name="password" type="password" required minLength={8} autoComplete="new-password" className={authField} /></label>
        <label className="block text-sm font-medium">Confirm new password<input name="confirm" type="password" required minLength={8} autoComplete="new-password" className={authField} /></label>
        {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
        <button disabled={busy || !ready} className={authButton}>{busy ? "Saving…" : "Save password"}</button>
      </form>
    </AuthCard>
  );
}
