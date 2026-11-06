import type { Metadata } from "next";
import Link from "@/i18n/client";
import { Suspense } from "react";
import { getOpenJobs } from "@/lib/data";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { formatDate } from "@/lib/format";
import { STORE } from "@/lib/constants";
import { getT } from "@/i18n/server";
import { languageAlternates } from "@/i18n/config";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("nav.careers"), description: t("careers.meta"), alternates: { canonical: "/careers", languages: languageAlternates("/careers") } };
}

export default async function CareersPage() {
  const { t } = await getT();
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <Breadcrumbs items={[{ label: t("nav.careers") }]} />
      <section className="rounded-md bg-gradient-to-r from-slate-900 to-brand-800 p-6 text-white sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent-400">{t("nav.careers")}</p>
        <h1 className="mt-2 text-3xl font-extrabold">{t("careers.h1")}</h1>
        <p className="mt-2 max-w-2xl text-brand-100">{t("careers.intro")}</p>
      </section>
      <Suspense fallback={<div className="mt-6 h-40 animate-pulse rounded-md bg-slate-100" />}>
        <JobList />
      </Suspense>
    </div>
  );
}

async function JobList() {
  const jobs = await getOpenJobs();
  const { t } = await getT();
  if (jobs.length === 0) {
    return (
      <p className="mt-6 rounded-md bg-white p-6 text-slate-600 ring-1 ring-slate-200">
        {t("careers.none")} <a href={`mailto:${STORE.email}`} className="font-semibold text-brand-700 hover:underline">{STORE.email}</a>.
      </p>
    );
  }
  return (
    <ul className="mt-6 space-y-3">
      {jobs.map((j) => (
        <li key={j.id}>
          <Link href={`/careers/${j.slug}`} className="block rounded-md bg-white p-5 ring-1 ring-slate-200 transition hover:shadow-md hover:ring-brand-600">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{j.title}</h2>
                <p className="mt-1 text-sm text-slate-600">
                  {[j.department, j.location, j.employment_type, j.experience && `${t("jobs.experience")}: ${j.experience}`].filter(Boolean).join(" · ")}
                </p>
              </div>
              <span className="rounded-md bg-accent-500 px-3 py-1.5 text-sm font-semibold text-white">{t("careers.applyBtn")} →</span>
            </div>
            <p className="mt-3 line-clamp-2 text-sm text-slate-700">{j.description}</p>
            <p className="mt-2 text-xs text-slate-400">{t("careers.posted", { date: formatDate(j.created_at) })}</p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
