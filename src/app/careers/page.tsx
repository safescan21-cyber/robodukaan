import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getOpenJobs } from "@/lib/data";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { formatDate } from "@/lib/format";
import { STORE } from "@/lib/constants";

export const metadata: Metadata = { title: "Careers", description: "Jobs at PCBDukaan — PCB repair, electronics and sales roles in India." };

export default function CareersPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <Breadcrumbs items={[{ label: "Careers" }]} />
      <section className="rounded-md bg-gradient-to-r from-slate-900 to-brand-800 p-6 text-white sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent-400">Careers</p>
        <h1 className="mt-2 text-3xl font-extrabold">Work with PCBDukaan</h1>
        <p className="mt-2 max-w-2xl text-brand-100">We repair and supply industrial electronics across India. Join our team of technicians, engineers and sales people.</p>
      </section>
      <Suspense fallback={<div className="mt-6 h-40 animate-pulse rounded-md bg-slate-100" />}>
        <JobList />
      </Suspense>
    </div>
  );
}

async function JobList() {
  const jobs = await getOpenJobs();
  if (jobs.length === 0) {
    return (
      <p className="mt-6 rounded-md bg-white p-6 text-slate-600 ring-1 ring-slate-200">
        There are no open positions right now. You can still send your CV to <a href={`mailto:${STORE.email}`} className="font-semibold text-brand-700 hover:underline">{STORE.email}</a>.
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
                  {[j.department, j.location, j.employment_type, j.experience && `Experience: ${j.experience}`].filter(Boolean).join(" · ")}
                </p>
              </div>
              <span className="rounded-md bg-accent-500 px-3 py-1.5 text-sm font-semibold text-white">Apply →</span>
            </div>
            <p className="mt-3 line-clamp-2 text-sm text-slate-700">{j.description}</p>
            <p className="mt-2 text-xs text-slate-400">Posted {formatDate(j.created_at)}</p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
