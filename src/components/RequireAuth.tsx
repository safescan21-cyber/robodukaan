"use client";

import Link from "@/i18n/client";
import { useEffect } from "react";
import { useI18n, useRouter } from "@/i18n/client";
import { useAuth } from "./AuthProvider";

export function RequireAuth({ admin = false, children }: { admin?: boolean; children: React.ReactNode }) {
  const { ready, user, profile, isAdmin } = useAuth();
  const router = useRouter();
  const { t } = useI18n();

  useEffect(() => {
    if (ready && !user) router.replace(`/login?next=${encodeURIComponent(window.location.pathname)}`);
  }, [ready, user, router]);

  if (!ready || !user || (admin && !profile)) {
    return <div className="mx-auto max-w-7xl px-4 py-16"><div className="h-48 animate-pulse rounded-md bg-slate-100" /></div>;
  }
  if (admin && !isAdmin) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="text-2xl font-bold">{t("auth.adminsOnly")}</h1>
        <p className="mt-2 text-slate-600">{t("auth.noAdminAccess")}</p>
        <Link href="/" className="mt-6 inline-block rounded-md bg-brand-600 px-5 py-2.5 font-semibold text-white">{t("common.backToStore")}</Link>
      </div>
    );
  }
  return <>{children}</>;
}
