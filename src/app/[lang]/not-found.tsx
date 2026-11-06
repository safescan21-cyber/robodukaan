"use client";

import Link from "@/i18n/client";

import { useI18n } from "@/i18n/client";

export default function NotFound() {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="text-6xl font-black text-brand-600">404</p>
      <h1 className="mt-4 text-2xl font-bold">{t("notFound.title")}</h1>
      <p className="mt-2 text-slate-600">{t("notFound.text")}</p>
      <Link href="/products" className="mt-6 inline-block rounded-lg bg-brand-600 px-5 py-2.5 font-semibold text-white hover:bg-brand-700">
        {t("notFound.browse")}
      </Link>
    </div>
  );
}
